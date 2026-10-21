<?php
$row = $db->query("SELECT `id`, `artlitreadings`, `title`, `article` FROM `liturgy` ORDER BY `id` LIMIT 1")->fetch();

if (!$row) {
    fail(404);
}

send_json($row);
