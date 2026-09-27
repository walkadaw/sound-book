<?php
start_session();

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // A cross-site <form> can only send text/plain or form content types, never application/json.
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        http_response_code(415);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    $id = intval($data["id"] ?? 0);
    $title = trim((string)($data["title"] ?? ''));
    $text = rtrim((string)($data["text"] ?? ''));
    $chord = rtrim((string)($data["chord"] ?? ''));
    $tag = rtrim((string)($data["tag"] ?? ''));

    if ($title === '') {
        http_response_code(400);
        exit();
    }

    if ($id > 0) {
        $sql = "UPDATE `sound_list` SET `title`=?, `text`=?, `chord`=?, `tag`=? WHERE `id`=?";
        $db->prepare($sql)->execute([$title, $text, $chord, $tag, $id]);
    } else {
        $sql = "INSERT INTO `sound_list` (`title`, `text`, `chord`, `tag`) VALUES (?, ?, ?, ?)";
        $db->prepare($sql)->execute([$title, $text, $chord, $tag]);
        $id = $db->lastInsertId();
    }

    $db->prepare("UPDATE `ad_options` SET `last_update`=? WHERE `id`=1")->execute([time()]);

    send_gzip(gzencode(json_encode([ 'id' => $id], JSON_UNESCAPED_UNICODE)));
}

exit();
