<?php
$data = read_admin_json();

$songId = intval($data['songId'] ?? 0);
$ids = $data['ids'] ?? null;

if (!is_array($ids)) {
    http_response_code(400);
    exit();
}

$ids = array_map('intval', $ids);

$db->beginTransaction();

$sth = $db->prepare("SELECT `id` FROM `sound_media` WHERE `song_id`=? FOR UPDATE");
$sth->execute([$songId]);
$current = array_map('intval', $sth->fetchAll(PDO::FETCH_COLUMN));

// The editor sends the whole list; one that went stale (a record added or deleted elsewhere) is refused.
$sorted = $ids;
sort($sorted);
sort($current);

if ($sorted !== $current) {
    $db->rollBack();
    http_response_code(409);
    exit();
}

$sth = $db->prepare("UPDATE `sound_media` SET `position`=? WHERE `id`=?");

foreach ($ids as $position => $id) {
    $sth->execute([$position, $id]);
}

$db->commit();

exit();
