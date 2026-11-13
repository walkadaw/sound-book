<?php
// Run by cron through the CLI only; over HTTP anyone could trigger the scrape.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit();
}

require dirname(__DIR__).'/classes/_class.db.php';
require __DIR__.'/_lectionary.php';

const LITURGY_SITE = 'https://catholic.by';
// From today on, enough for the Sunday after next when today is a Sunday.
const DAYS_AHEAD = 15;
// catholic.by is asked at most once in this many seconds.
const REQUEST_PAUSE = 2;

// The days are those of Minsk, whatever zone the server is in.
date_default_timezone_set('Europe/Minsk');

$today = new DateTimeImmutable('today');
$db = (new db())->connect();

// Yesterday stays: liturgy/get still gives it to the devices west of Minsk.
$db->prepare("DELETE FROM `liturgy` WHERE `date` < ?")->execute([$today->modify('-1 day')->format('Y-m-d')]);

$stored = $db->query("SELECT DISTINCT `date` FROM `liturgy`")->fetchAll(PDO::FETCH_COLUMN);
$insert = $db->prepare("INSERT INTO `liturgy` (`date`, `artlitreadings`, `url`, `title`, `sections`) VALUES (?, ?, ?, ?, ?)");
// one download a month, shared by its days
$calendars = [];

// The texts are put on catholic.by by hand, usually a month ahead. A day that is not there yet, or that failed
// to download, is no error: it is skipped and asked for again on the next run.
for ($offset = 0; $offset < DAYS_AHEAD; $offset++) {
    $date = $today->modify("+$offset day");

    if (in_array($date->format('Y-m-d'), $stored, true)) {
        continue;
    }

    $month = $date->format('Y-n');
    $calendars[$month] ??= fetch_html(LITURGY_SITE.'/3/liturgy/lit-calendar?filterdate='.$month) ?? '';

    $liturgy = $calendars[$month] === '' ? null : day_liturgy($calendars[$month], $date);

    if (!$liturgy) {
        continue;
    }

    // a day goes in whole or not at all; the rows keep the calendar order, the first one is the default mass
    $db->beginTransaction();
    foreach ($liturgy as $mass) {
        $insert->execute([$date->format('Y-m-d'), $mass['readings'], $mass['url'], $mass['title'], json_encode($mass['sections'], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
    }
    $db->commit();
}

/**
 * The masses of a day with a lectionary page, null when a page of the day did not download: the day is then
 * left for the next run rather than stored without one of its masses.
 *
 * @return ?array{readings: string, url: string, title: string, sections: array[]}[]
 */
function day_liturgy(string $calendar, DateTimeImmutable $date): ?array {
    $year = liturgical_year($date);
    $liturgy = [];
    // options of one page (the Christmas masses) share the download
    $pages = [];
    $positions = [];

    foreach (calendar_options($calendar, $date->format('d.m.Y')) as $option) {
        $href = $option['href'];
        $positions[$href] = ($positions[$href] ?? -1) + 1;

        if (!array_key_exists($href, $pages)) {
            $html = fetch_html(LITURGY_SITE.$href);

            if ($html === null) {
                return null;
            }

            $pages[$href] = lectionary_page($html, $year);
        }

        $mass = option_mass($pages[$href], $option['readings'], $positions[$href]);

        if ($mass !== null) {
            $liturgy[] = ['readings' => $option['readings'], 'url' => LITURGY_SITE.$href, ...$mass];
        }
    }

    return $liturgy;
}

function fetch_html(string $url): ?string {
    static $last = 0.0;

    $wait = $last + REQUEST_PAUSE - microtime(true);

    if ($wait > 0) {
        usleep((int)($wait * 1e6));
    }

    $last = microtime(true);
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
