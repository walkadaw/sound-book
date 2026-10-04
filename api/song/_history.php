<?php
start_session();

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET["id"])) {
    $sth = $db->prepare("SELECT h.`id`, h.`title`, h.`text`, h.`chord`, h.`tag`, u.`username`, h.`created_at`, h.`updated_at`
        FROM `sound_list_history` h
        LEFT JOIN `sound_user` u ON u.`id` = h.`user_id`
        WHERE h.`song_id`=?
        ORDER BY h.`id` DESC");
    $sth->execute([intval($_GET['id'])]);

    $versions = [];

    while ($row = $sth->fetch()) {
        $versions[] = [
            "id" => (int)$row["id"],
            "title" => $row["title"],
            "text" => $row["text"],
            "chord" => $row["chord"],
            "tag" => $row["tag"],
            "userName" => $row["username"],
            "createdAt" => $row["created_at"] === null ? null : (int)$row["created_at"],
            "updatedAt" => $row["updated_at"] === null ? null : (int)$row["updated_at"],
        ];
    }

    send_gzip(gzencode(json_encode($versions, JSON_UNESCAPED_UNICODE)));
}

exit();
