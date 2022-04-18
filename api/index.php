<?PHP
header('Content-Type: application/json');
header('Content-Encoding: gzip'); 
// TODO removed
header('Access-Control-Allow-Origin: *'); 

function __autoload($name){ 
	include "classes/_class.".$name.".php";
}

$db = new db();
$dsn = "mysql:host=$config->HostDB;dbname=$config->BaseDB;charset=$config->charset";
$opt = [
	PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
	PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
	PDO::ATTR_EMULATE_PREPARES   => false,
];
$db = $db->connect();
$page = trim($_GET["mpage"], "/");

switch($page){
	case "liturgy/get-slide": include("liturgy/_get_slide.php"); break;		
	case "liturgy/get": include("liturgy/_get.php"); break;		
	case "song/get":  include("song/_get_song.php"); break; 
	case "song/set":  include("song/_set_song.php"); break; 
	// case "song/update-slide":  include("song/_get_song.php"); break; 
	# 403 error by default
	default: header('HTTP/1.1 403 Forbidden'); break;

}
	
