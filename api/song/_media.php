<?php
$sth = $db->prepare("SELECT `id`, `source`, `ref`, `title`, `author`, `duration`, `start_at`, `end_at`
    FROM `sound_media`
    WHERE `song_id`=?
    ORDER BY `position`, `id`");
$sth->execute([intval($_GET['id'] ?? 0)]);

send_json(array_map(fn(array $row) => [
    'id' => (int)$row['id'],
    'source' => $row['source'],
    'ref' => $row['ref'],
    'title' => $row['title'],
    'author' => $row['author'],
    'duration' => nullable_int($row['duration']),
    'startAt' => nullable_int($row['start_at']),
    'endAt' => nullable_int($row['end_at']),
], $sth->fetchAll()));
