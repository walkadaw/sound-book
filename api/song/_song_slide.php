<?php

$sql = $db->query("SELECT `id`, `title`, `text` FROM `sound_list`");

if($sql->rowCount() > 0){

	$monitor = "16:9";
	$slide = new slide($monitor);

	while($row = $sql->fetch()){
		$tmp = json_encode( $slide->song($row["text"], "web", $row["id"], $row["title"]), JSON_UNESCAPED_UNICODE );
		$db->prepare("UPDATE `sound_list` SET `slide`=? WHERE `id`=?")->execute([$tmp, $row["id"]]);
	} 
}
