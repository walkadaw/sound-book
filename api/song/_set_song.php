<?php
start_session();

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    exit();
}

// Saves by the same user closer together than this belong to one editing session and share one version.
const HISTORY_MERGE_SECONDS = 600;

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

    $userId = (int)$_SESSION['user_id'];
    $now = time();
    $song = [$title, $text, $chord, $tag];

    $db->beginTransaction();

    if ($id > 0) {
        $sth = $db->prepare("SELECT `title`, `text`, `chord`, `tag` FROM `sound_list` WHERE `id`=? FOR UPDATE");
        $sth->execute([$id]);
        $old = $sth->fetch();

        if (!$old) {
            $db->rollBack();
            http_response_code(404);
            exit();
        }

        if (array_values($old) !== $song) {
            saveHistory($db, $id, $old, $song, $userId, $now);

            $sql = "UPDATE `sound_list` SET `title`=?, `text`=?, `chord`=?, `tag`=? WHERE `id`=?";
            $db->prepare($sql)->execute([...$song, $id]);
        }
    } else {
        $sql = "INSERT INTO `sound_list` (`title`, `text`, `chord`, `tag`) VALUES (?, ?, ?, ?)";
        $db->prepare($sql)->execute($song);
        $id = (int)$db->lastInsertId();

        insertHistory($db, $id, $song, $userId, $now);
    }

    $db->prepare("UPDATE `ad_options` SET `last_update`=? WHERE `id`=1")->execute([$now]);

    $db->commit();

    send_gzip(gzencode(json_encode([ 'id' => $id], JSON_UNESCAPED_UNICODE)));
}

exit();

function saveHistory($db, $id, $old, $song, $userId, $now) {
    $sth = $db->prepare("SELECT `id`, `user_id`, COALESCE(`updated_at`, `created_at`) AS `changed_at`
        FROM `sound_list_history` WHERE `song_id`=? ORDER BY `id` DESC LIMIT 1");
    $sth->execute([$id]);
    $last = $sth->fetch();

    // Songs that predate the history get their untouched text as the first version.
    if (!$last) {
        insertHistory($db, $id, array_values($old), null, null);
    } elseif ((int)$last['user_id'] === $userId && $last['changed_at'] >= $now - HISTORY_MERGE_SECONDS) {
        $sql = "UPDATE `sound_list_history` SET `title`=?, `text`=?, `chord`=?, `tag`=?, `updated_at`=? WHERE `id`=?";
        $db->prepare($sql)->execute([...$song, $now, $last['id']]);
        return;
    }

    insertHistory($db, $id, $song, $userId, $now);
}

function insertHistory($db, $id, $song, $userId, $now) {
    $sql = "INSERT INTO `sound_list_history` (`song_id`, `title`, `text`, `chord`, `tag`, `user_id`, `created_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?)";
    $db->prepare($sql)->execute([$id, ...$song, $userId, $now]);
}
