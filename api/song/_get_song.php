<?php

$version_request = intval($_GET["last_update"]);

$sql = $db->query("SELECT last_update FROM ad_options where id = '1'");
$last_update = $sql->fetch()['last_update'];

if(isset($_GET["slide"])){
    $fillename = __DIR__."/../tmp/_list_song_json.txt";
}else{
    $fillename = __DIR__."/../tmp/_list_song_json_noslide.txt";
   
}
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
    $slide = [];
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
        $slide[] = [
            "id" => $row["id"],
            "title" => $row["title"],
            "slides" => json_decode($row["slide"])
        ];
    }

    $list_result =  gzencode(json_encode([ 'songs' => $list,'last_update' => $last_update,], JSON_UNESCAPED_UNICODE));
    $slide_result =  gzencode(json_encode([ 'slides' => $slide,'last_update' => $last_update,], JSON_UNESCAPED_UNICODE));
        
    file_put_contents(__DIR__."/../tmp/_list_song_json_noslide.txt", $list_result );
    file_put_contents(__DIR__."/../tmp/_list_song_json.txt", $slide_result );
    file_put_contents(__DIR__."/../tmp/_list_song_json_update.txt", $last_update );

    return isset($_GET["slide"]) ? $slide_result : $list_result;
}

exit();
