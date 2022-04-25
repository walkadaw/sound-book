<?php

// get By ID
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET["id"])) {
    $id = intval($_GET['id']);

    $sth = $db->prepare("SELECT * FROM `sound_list` WHERE id=?");
    $sth->execute([$id]);
    $row = $sth->fetch();

    if (!$row) {
        http_response_code(404);
        exit(404);
    }

    $tag = explode(",", rtrim($row["tag"], ", "));
    $tags = [];

    foreach ($tag as $value) {
        if( $value > 0 ) $tags[$value] = 1;
    }

    echo gzencode(json_encode([
        "id" => $row["id"],
        "title" => $row["title"],
        "text" => $row["text"],
        "chord" => $row["chord"],
        "tag" => $tags
      ], JSON_UNESCAPED_UNICODE));
    
    exit();
}

// GET ALL SONGS WITH CACHE
$version_request = intval($_GET["last_update"]);

$sql = $db->query("SELECT last_update FROM ad_options where id = '1'");
$last_update = $sql->fetch()['last_update'];
$fillename = __DIR__."/../tmp/_list_song_json_noslide.txt";
   
try {
    $last_update_file = file_get_contents(__DIR__."/../tmp/_list_song_json_update.txt");
} catch (Exception $e) {
    $last_update_file = 0;
}


if($last_update_file != $last_update || !($list = file_get_contents($fillename)) ){
    $list = updateList($db, $fillename, $last_update);
}

echo $list;

function updateList($db, $fillename, $last_update){
    $list = [];
    $sql = $db->query("SELECT * FROM sound_list");
    while($row = $sql->fetch()){
        $tag = explode(",", rtrim($row["tag"], ", "));
        $tags = [];
        foreach ($tag as $value) {
            if( $value > 0 ) $tags[$value] = 1;
        }
        $list[] = [
            "id" => $row["id"],
            "title" => $row["title"],
            "text" => $row["text"],
            "chord" => $row["chord"],
            "tag" => $tags
          ];
    }

    $list_result =  gzencode(json_encode([ 'songs' => $list,'last_update' => $last_update,], JSON_UNESCAPED_UNICODE));
        
    file_put_contents(__DIR__."/../tmp/_list_song_json_noslide.txt", $list_result );
    file_put_contents(__DIR__."/../tmp/_list_song_json_update.txt", $last_update );

    return $list_result;
}

exit();
