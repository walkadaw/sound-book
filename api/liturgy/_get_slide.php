<?php
require __DIR__.'/_slides.php';

// the slides follow the mass shown by default
$sections = $db->query("SELECT `sections` FROM `liturgy` ORDER BY `id` LIMIT 1")->fetchColumn();

send_json($sections === false ? [] : liturgy_slides(json_decode($sections, true)));
