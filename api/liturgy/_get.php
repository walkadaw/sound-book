<?php
$sql = $db->query("SELECT * FROM liturgy ORDER BY id ASC limit 1");
$row = $sql->fetch();

send_gzip(gzencode(json_encode($row, JSON_UNESCAPED_UNICODE)));
exit();