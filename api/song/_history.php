<?php
require_admin();

$sth = $db->prepare("SELECT h.`id`, h.`title`, h.`text`, h.`chord`, h.`tag`, u.`username`, h.`created_at`, h.`updated_at`
    FROM `sound_list_history` h
    LEFT JOIN `sound_user` u ON u.`id` = h.`user_id`
    WHERE h.`song_id`=?
    ORDER BY h.`id` DESC");
$sth->execute([intval($_GET['id'] ?? 0)]);

send_json(array_map(fn(array $row) => [
    'id' => (int)$row['id'],
    'title' => $row['title'],
    'text' => $row['text'],
    'chord' => $row['chord'],
    'tag' => $row['tag'],
    'userName' => $row['username'],
    'createdAt' => nullable_int($row['created_at']),
    'updatedAt' => nullable_int($row['updated_at']),
], $sth->fetchAll()));
