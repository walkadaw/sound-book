<?php
// Usage counters for the admin: [{"id", "view", "showP", "favorite"}] for every song that was used at least once.
start_session();

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    exit();
}

// Titles are left out: the client already holds the song list and joins by id.
$sth = $db->query("SELECT `id`, `view`, `showP`, `favorite` FROM `sound_list` WHERE `view` > 0 OR `showP` > 0 OR `favorite` > 0");

$stats = [];
while ($row = $sth->fetch()) {
    $stats[] = [
        "id" => (int)$row["id"],
        "view" => (int)$row["view"],
        "showP" => (int)$row["showP"],
        "favorite" => (int)$row["favorite"],
    ];
}

send_gzip(gzencode(json_encode($stats)));
exit();
