<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $songs = json_decode($_POST['songs'], JSON_UNESCAPED_UNICODE);
    $options = json_decode($_POST['options'], JSON_UNESCAPED_UNICODE);

	$song_list = "";
	foreach ($songs as $value) {
		$id = intval($value);
		if($id > 0){
			$song_list .= $id.",";
		}
	}

	$song_list = rtrim($song_list,",");
    
    $sth = $db->prepare("SELECT `id`, `id`, `title`,`text`,`chord`,`tag` FROM sound_list WHERE `id` IN (". $song_list .")");
    $sth->execute();

	$result = array_map('reset', $sth->fetchAll(PDO::FETCH_GROUP|PDO::FETCH_ASSOC));

	foreach ($songs as $value) {
		$id = intval($value);
		if($id > 0 && $result[$value]){
			$data[] = $result[$value];
		}
	}

    $docx = new docx;

    if (!isset($data)) {
        exit();
    }
   
    $file = $docx->genDocX($data, $options);
    if($file){
        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: attachment; filename="SongBook.docx"');
        header('Content-Encoding: none'); 
        
        readfile('./tmp/'.$file);
    }

}

exit();
