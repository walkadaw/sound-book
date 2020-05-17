<?php

$song_id = intval($_POST['song_id']);

$sql = $db->query("SELECT `id`, `title`, `text` FROM `sound_list` where `id` = $song_id");
if($sql->rowCount() > 0){

	$monitor = "16:9";
	$slide = new slide($monitor);

	while($row = $sql->fetch()){

		echo $slide->song($row["text"], "web", $row["id"], $row["title"]);
	} 
}