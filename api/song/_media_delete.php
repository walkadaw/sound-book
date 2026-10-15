<?php
$data = read_admin_json();

$sth = $db->prepare("DELETE FROM `sound_media` WHERE `id`=?");
$sth->execute([intval($data['id'] ?? 0)]);

if (!$sth->rowCount()) {
    http_response_code(404);
}

exit();
