<?php
// The days stored ahead by the parser, from yesterday on: a device west of Minsk may still be on yesterday.
// The masses by their day (YYYY-MM-DD), in the calendar order, the default one first. The client picks the day by
// its own date.
date_default_timezone_set('Europe/Minsk');

$query = $db->prepare("SELECT `id`, `date`, `artlitreadings` AS `readings`, `url`, `title`, `sections` FROM `liturgy` WHERE `date` >= ? ORDER BY `date`, `id`");
$query->execute([(new DateTimeImmutable('yesterday'))->format('Y-m-d')]);

$days = [];

foreach ($query->fetchAll() as $row) {
    $date = $row['date'];
    unset($row['date']);
    $days[$date][] = [...$row, 'id' => (int)$row['id'], 'sections' => json_decode($row['sections'], true)];
}

// an object even without days: an empty PHP array would go out as []
send_json((object)$days);
