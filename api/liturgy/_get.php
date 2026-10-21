<?php
// The masses of the day in the calendar order; the first one is shown by default.
$rows = $db->query("SELECT `id`, `artlitreadings` AS `readings`, `title`, `sections` FROM `liturgy` ORDER BY `id`")->fetchAll();

if (!$rows) {
    fail(404);
}

send_json(array_map(fn(array $row) => [...$row, 'sections' => json_decode($row['sections'], true)], $rows));
