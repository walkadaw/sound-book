<?php
$data = read_admin_json();

$songId = intval($data['songId'] ?? 0);
$ids = $data['ids'] ?? null;

if (!is_array($ids)) {
    fail(400);
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
    fail(409);
}

$sth = $db->prepare("UPDATE `sound_media` SET `position`=? WHERE `id`=?");

foreach ($ids as $position => $id) {
    $sth->execute([$position, $id]);
}

$db->commit();

exit();
