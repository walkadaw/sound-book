<?php
// Usage counters for the admin: [{"id", "view", "showP", "favorite"}] for every song that was used at least once.
require_admin();

// Titles are left out: the client already holds the song list and joins by id.
$sth = $db->query("SELECT `id`, `view`, `showP`, `favorite` FROM `sound_list` WHERE `view` > 0 OR `showP` > 0 OR `favorite` > 0");

send_json(array_map(fn(array $row) => array_map('intval', $row), $sth->fetchAll()));
