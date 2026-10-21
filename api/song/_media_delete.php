<?php
require __DIR__.'/_media_files.php';

$data = read_admin_json();
$id = intval($data['id'] ?? 0);

$sth = $db->prepare("SELECT `source`, `ref` FROM `sound_media` WHERE `id`=?");
$sth->execute([$id]);
$media = $sth->fetch();

$sth = $db->prepare("DELETE FROM `sound_media` WHERE `id`=?");
$sth->execute([$id]);

if (!$sth->rowCount()) {
    fail(404);
}

if ($media['source'] === 'upload') {
    delete_unused_upload($db, $media['ref']);
}

exit();
