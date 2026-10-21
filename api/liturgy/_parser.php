<?php
// Run by cron through the CLI only; over HTTP anyone could trigger the scrape.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit();
}

require dirname(__DIR__).'/classes/_class.db.php';
require __DIR__.'/_sanitize.php';

const LITURGY_SITE = 'https://catholic.by';

// "Today" on catholic.by is the day in Minsk, whatever zone the server is in.
date_default_timezone_set('Europe/Minsk');

$calendar = fetch_html(LITURGY_SITE.'/3/liturgy/lit-calendar?filterdate='.date('Y-n'));

if ($calendar === null) {
    exit(1);
}

$xpath = new DOMXPath(load_html($calendar));
$today = "//div[contains(@class,'artlititem')]//div[contains(@class,'artlitdate') and contains(., '".date('d.m.Y')."')]/..";

// A day may have several masses, each with its short reading list and a link to the full texts.
$liturgy = [];

foreach ($xpath->query("$today//div[contains(@class,'artlitreadings')]") as $key => $readings) {
    $liturgy[$key]['readings'] = $readings->nodeValue;
}

foreach ($xpath->query("$today//div[@class='artlitreadings']//a/@href") as $key => $href) {
    $page = fetch_html(LITURGY_SITE.$href->nodeValue);

    if ($page === null) {
        continue;
    }

    $pageXpath = new DOMXPath(load_html($page));
    $liturgy[$key]['title'] = trim(last_node($pageXpath->query("//div[@class='page-header']"))?->nodeValue ?? '');
    $liturgy[$key]['article'] = trim(fill_refrains(sanitize_liturgy_html(inner_html(last_node($pageXpath->query("//div[@class='article']"))))));
}

// A failed scrape (site down, markup changed) keeps yesterday's reading instead of an empty page.
$liturgy = array_filter($liturgy, fn(array $mass) => !empty($mass['article']));

if (!$liturgy) {
    exit(1);
}

$db = (new db())->connect();
$insert = $db->prepare("INSERT INTO `liturgy` (`artlitreadings`, `title`, `article`) VALUES (?, ?, ?)");

// DELETE rather than TRUNCATE: TRUNCATE commits implicitly, so a failing insert would still wipe the table.
$db->beginTransaction();
$db->exec("DELETE FROM `liturgy`");
foreach ($liturgy as $mass) {
    $insert->execute([$mass['readings'] ?? '', $mass['title'] ?? '', $mass['article']]);
}
$db->commit();

function fetch_html(string $url): ?string {
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FAILONERROR => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 10,
        // any encoding the server offers
        CURLOPT_ENCODING => '',
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_7; en-US) AppleWebKit/534.16 (KHTML, like Gecko) Chrome/10.0.648.205 Safari/534.16',
    ]);
    $html = curl_exec($curl);

    return is_string($html) && $html !== '' ? $html : null;
}

function last_node(DOMNodeList $nodes): ?DOMNode {
    return $nodes->item($nodes->length - 1);
}

// Each child is saved as a document of its own: unlike saveHTML($node), that keeps the line breaks between blocks.
function inner_html(?DOMNode $node): string {
    $html = '';

    foreach ($node?->childNodes ?? [] as $child) {
        $document = new DOMDocument('1.0', 'utf-8');
        $document->appendChild($document->importNode($child, true));
        $html .= $document->saveHTML();
    }

    return $html;
}

// The refrain is printed in full once and later often as a bare "Рэфрэн:"; those get the words of the last full one.
function fill_refrains(string $html): string {
    $refrain = null;
    $refrainEnd = null;

    return preg_replace_callback('#Рэфрэн:(.+?)(<br>|</p>)#is', function (array $match) use (&$refrain, &$refrainEnd, $html): string {
        [$text, $offset] = $match[0];

        if (!has_text($match[1][0])) {
            return $refrain ?? $text;
        }

        // A psalm may offer a second refrain printed right after the first; the repeats keep the first.
        if ($refrainEnd === null || has_text(substr($html, $refrainEnd, $offset - $refrainEnd))) {
            $refrain = $text;
        }

        $refrainEnd = $offset + strlen($text);

        return $text;
    }, $html, flags: PREG_OFFSET_CAPTURE);
}

// a bare "Рэфрэн: </b>" still holds a space, often a non-breaking one
function has_text(string $html): bool {
    return trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'), " \t\r\n\u{a0}") !== '';
}
