<?php
// Run by cron through the CLI only; over HTTP anyone could trigger the scrape.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit();
}

require dirname(__DIR__).'/classes/_class.db.php';
require __DIR__.'/_lectionary.php';

const LITURGY_SITE = 'https://catholic.by';

// "Today" on catholic.by is the day in Minsk, whatever zone the server is in.
date_default_timezone_set('Europe/Minsk');

$today = new DateTimeImmutable('today');
$calendar = fetch_html(LITURGY_SITE.'/3/liturgy/lit-calendar?filterdate='.$today->format('Y-n'));

if ($calendar === null) {
    exit(1);
}

$year = liturgical_year($today);
$liturgy = [];
// options of one page (the Christmas masses) share the download
$pages = [];
$positions = [];

foreach (calendar_options($calendar, $today->format('d.m.Y')) as $option) {
    $href = $option['href'];
    $positions[$href] = ($positions[$href] ?? -1) + 1;

    if (!array_key_exists($href, $pages)) {
        $html = fetch_html(LITURGY_SITE.$href);
        $pages[$href] = $html === null ? null : lectionary_page($html, $year);
    }

    $mass = $pages[$href] === null ? null : option_mass($pages[$href], $option['readings'], $positions[$href]);

    if ($mass !== null) {
        $liturgy[] = ['readings' => $option['readings'], ...$mass];
    }
}

// A failed scrape (site down, markup changed) keeps yesterday's reading instead of an empty page.
if (!$liturgy) {
    exit(1);
}

$db = (new db())->connect();
$insert = $db->prepare("INSERT INTO `liturgy` (`artlitreadings`, `title`, `sections`) VALUES (?, ?, ?)");

// DELETE rather than TRUNCATE: TRUNCATE commits implicitly, so a failing insert would still wipe the table.
// The rows keep the calendar order: the first one is the mass shown by default.
$db->beginTransaction();
$db->exec("DELETE FROM `liturgy`");
foreach ($liturgy as $mass) {
    $insert->execute([$mass['readings'], $mass['title'], json_encode($mass['sections'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
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
