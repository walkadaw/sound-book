<?php

if(isset($_POST["json"])){
	$dataList = json_decode($_POST["json"]);
	$slides = NULL;

	$sql = $db->query("SELECT * FROM liturgy ORDER BY id DESC limit 1");
    $row = $sql->fetch();
    $liturgia = array();

	preg_match_all("#ПЕРШАЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $liturgia[1]);
	preg_match_all("#ДРУГОЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $liturgia[2]);
	preg_match_all("#РЭСПАНСАРЫЙНЫ ПСАЛЬМ(.+?)<span class=\"divider\">#is", $row["article"], $liturgia[3]);
	preg_match("#СПЕЎ ПЕРАД ЕВАНГЕЛЛЕМ(.+?)ЕВАНГЕЛЛЕ#is", $row["article"], $liturgia[4]);
	preg_match("#<b>ЕВАНГЕЛЛЕ(.+?)Пераклад здзейснены#is", $row["article"], $liturgia[5]);

	foreach ($dataList as $key => $value) {
		if(is_numeric($value)){
			$sql = $db->query("SELECT * FROM sound_list where id = '".intval($value)."'");
				if($sql->rowCount() > 0){
					$row = $sql->fetch();
					$db->query("UPDATE sound_list set showP = showP + 1 where id = '".$row["id"]."'");
				    $slides .= $func->song($row["text"], $row["id"], $row["title"], true);
				}

		}else{
			if($value == "read-1"){ $slides .= $func->gen_linurgia($liturgia[1][1][0], "read-1", "ПЕРШАЕ ЧЫТАННЕ"); }
			else if($value == "read-2"){ $slides .= $func->gen_linurgia($liturgia[2][1][0], "read-1", "ДРУГОЕ ЧЫТАННЕ"); }
			else if($value == "psalm-1"){ $slides .= $func->psalm($liturgia[3][1][0], "psalm-1", "РЭСПАНСАРЫЙНЫ ПСАЛЬМ"); }
			else if($value == "evangele-1"){ $slides .= $func->gen_linurgia($liturgia[5][1], "evangele-1", " ЕВАНГЕЛЛЕ"); }
		}
	}
	echo $slides;
}
