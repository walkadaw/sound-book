<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
   
    $id = intval($data["id"]);
    $title = addslashes(trim($data["title"]));
    $text = addslashes(rtrim($data["text"]));
    $chord = addslashes(rtrim($data["chord"]));
    $tag = addslashes(rtrim($data["tag"]));


    if ($id > 0) {
        $sql = "UPDATE `sound_list` SET `title`=?, `text`=?, `chord`=?, `tag`=? WHERE `id`=?";
        $db->prepare($sql)->execute([$title, $text, $chord, $tag, $id]);
        
        echo gzencode(json_encode([ 'id' => $id], JSON_UNESCAPED_UNICODE));
    } else {
        $sql = "INSERT INTO `sound_list` (`title`, `text`, `chord`, `tag`) VALUES (?, ?, ?, ?)";
        $db->prepare($sql)->execute([$title, $text, $chord, $tag]);
        
        echo gzencode(json_encode([ 'id' => $db->lastInsertId()], JSON_UNESCAPED_UNICODE));
    }
    
    $db->query("UPDATE `ad_options` SET `last_update`= '".time()."' WHERE `id`= 1");
}

exit();
