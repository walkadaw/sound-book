<?php
$sql = $db->query("SELECT * FROM liturgy ORDER BY id ASC limit 1");
$row = $sql->fetch();
$lit = [];

preg_match_all("#ПЕРШАЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $lit[1]);
preg_match_all("#ДРУГОЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $lit[2]);
preg_match_all("#ТРЭЦЯЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $lit[6]);
preg_match_all("#ЧАЦВЁРТАЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $lit[7]);
preg_match_all("#ПЯТАЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $lit[8]);
preg_match_all("#ШОСТАЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $lit[9]);
preg_match_all("#СЁМАЕ ЧЫТАННЕ(.+?)<span class=\"divider\">#is", $row["article"], $lit[10]);
preg_match_all("#ЭПІСТАЛА(.+?)<span class=\"divider\">#is", $row["article"], $lit[11]);
preg_match_all("#РЭСПАНСАРЫЙНЫ ПСАЛЬМ(.+?)(<span class=\"divider\">|СПЕЎ ПЕРАД)#is", $row["article"], $lit[3]);
preg_match_all("#СПЕЎ ПЕРАД ЕВАНГЕЛЛЕМ(.+?)(<span class=\"divider\">|ЕВАНГЕЛЛЕ)#is", $row["article"], $lit[4]);
preg_match_all("#<b>ЕВАНГЕЛЛЕ(.+?)(Пераклад здзейснены|<div align=\"center\">|<span class=\"divider\">)#is", $row["article"], $lit[5]);

$lit[1][1] = array_merge_recursive($lit[1][1], $lit[2][1], $lit[6][1], $lit[7][1], $lit[8][1], $lit[9][1], $lit[10][1], $lit[11][1]);

$func = new func();
$read = $func->parshLiturg($row["artlitreadings"]);

$monitor = "16:9";
$slide = new slide($monitor);

$slide_result = $slide->genLitur($lit, $read, "web");

echo gzencode(json_encode($slide_result, JSON_UNESCAPED_UNICODE));
exit();