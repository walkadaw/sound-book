<?php
// Usage counters batched by the client: {"view": {"<id>": count}, "show": {...}, "favorite": {...}}.
// Public and unauthenticated, so the input is clamped to keep a single request from skewing the numbers.

// Enough for a long offline stretch; anything above is not a real client.
const MAX_SONGS = 500;
const MAX_COUNT = 100;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit();
}

// Sent with sendBeacon, which can only use a CORS-safelisted type, so the body is read regardless of Content-Type.
$data = json_decode(file_get_contents('php://input'), true);

if (!is_array($data)) {
    http_response_code(400);
    exit();
}

$counts = [];

foreach (['view' => 0, 'show' => 1, 'favorite' => 2] as $kind => $column) {
    if (!isset($data[$kind]) || !is_array($data[$kind])) {
        continue;
    }

    foreach ($data[$kind] as $id => $count) {
        $id = intval($id);
        $count = min(intval($count), MAX_COUNT);

        if ($id <= 0 || $count <= 0) {
            continue;
        }

        $counts[$id] = $counts[$id] ?? [0, 0, 0];
        $counts[$id][$column] += $count;
    }
}

if (count($counts) > MAX_SONGS) {
    http_response_code(413);
    exit();
}

if ($counts) {
    // Counters only: `ad_options.last_update` is left alone, so the cached song list stays valid for every client.
    $sth = $db->prepare("UPDATE `sound_list` SET `view` = `view` + ?, `showP` = `showP` + ?, `favorite` = `favorite` + ? WHERE `id` = ?");

    $db->beginTransaction();
    foreach ($counts as $id => [$view, $show, $favorite]) {
        $sth->execute([$view, $show, $favorite, $id]);
    }
    $db->commit();
}

http_response_code(204);
exit();
