<?php
$data = read_admin_json();

$id = intval($data['id'] ?? 0);
$songId = intval($data['songId'] ?? 0);
$source = (string)($data['source'] ?? '');
$ref = trim((string)($data['ref'] ?? ''));
$title = media_text($data['title'] ?? null);
$author = media_text($data['author'] ?? null);
$duration = media_seconds($data['duration'] ?? null);
$startAt = media_seconds($data['startAt'] ?? null);
$endAt = media_seconds($data['endAt'] ?? null);

// The same checks the song page applies before it embeds a ref (song-media-player.ts).
$refPatterns = [
    'youtube' => '/^[\w-]{11}$/',
    'gdrive' => '/^[\w-]+$/',
    'file' => '/^https:\/\/\S+$/',
    'upload' => MEDIA_UPLOAD_REF,
];

if (
    !isset($refPatterns[$source]) || !preg_match($refPatterns[$source], $ref) || strlen($ref) > 1024
    || $duration === false || $startAt === false || $endAt === false
    || ($startAt !== null && $endAt !== null && $endAt <= $startAt)
    || ($source === 'upload' && !is_file(media_upload_path($ref)))
) {
    http_response_code(400);
    exit();
}

$db->beginTransaction();

// Locking the song serializes inserts, so two of them never take the same position.
$sth = $db->prepare("SELECT `id` FROM `sound_list` WHERE `id`=? FOR UPDATE");
$sth->execute([$songId]);

if (!$sth->fetch()) {
    $db->rollBack();
    http_response_code(404);
    exit();
}

$fields = [$source, $ref, $title, $author, $duration, $startAt, $endAt];
$previous = null;

if ($id > 0) {
    $sth = $db->prepare("SELECT `source`, `ref` FROM `sound_media` WHERE `id`=? AND `song_id`=?");
    $sth->execute([$id, $songId]);
    $previous = $sth->fetch();

    if (!$previous) {
        $db->rollBack();
        http_response_code(404);
        exit();
    }

    $sth = $db->prepare("UPDATE `sound_media`
        SET `source`=?, `ref`=?, `title`=?, `author`=?, `duration`=?, `start_at`=?, `end_at`=?
        WHERE `id`=?");
    $sth->execute(array_merge($fields, [$id]));
} else {
    $sth = $db->prepare("INSERT INTO `sound_media`
        (`song_id`, `position`, `source`, `ref`, `title`, `author`, `duration`, `start_at`, `end_at`, `created_at`)
        SELECT ?, COALESCE(MAX(`position`) + 1, 0), ?, ?, ?, ?, ?, ?, ?, ?
        FROM `sound_media` WHERE `song_id`=?");
    $sth->execute(array_merge([$songId], $fields, [time(), $songId]));
    $id = (int)$db->lastInsertId();
}

$db->commit();

// a record whose file was replaced or that now links elsewhere leaves the old file behind
if ($previous && $previous['source'] === 'upload' && $previous['ref'] !== $ref) {
    delete_unused_upload($db, $previous['ref']);
}

send_gzip(gzencode(json_encode(['id' => $id])));

exit();

function media_text($value) {
    $value = trim((string)$value);

    return $value === '' ? null : mb_substr($value, 0, 255);
}

// null for an empty value, false for one that does not fit the SMALLINT UNSIGNED columns
function media_seconds($value) {
    if ($value === null || $value === '') {
        return null;
    }

    return is_int($value) && $value >= 0 && $value <= 65535 ? $value : false;
}
