<?php
require __DIR__.'/_slides.php';

$row = $db->query("SELECT `artlitreadings`, `article` FROM `liturgy` ORDER BY `id` LIMIT 1")->fetch();

send_json($row ? liturgy_slides(liturgy_sections($row['article']), parse_readings($row['artlitreadings'])) : []);
