<?PHP
header('Content-Type: application/json');

spl_autoload_register(function ($name) {
	include __DIR__."/classes/_class.".$name.".php";
});

// Content-Encoding is only valid for bodies that really are gzip; error responses are sent empty.
function send_gzip($body){
	header('Content-Encoding: gzip');
	echo $body;
}

function start_session(){
	session_set_cookie_params([
		'lifetime' => 0,
		'path' => '/',
		'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
		'httponly' => true,
		// Lax keeps the cookie off cross-site POSTs, which is what protects song/update from CSRF.
		'samesite' => 'Lax',
	]);
	session_start();
}

$db = new db();
$db = $db->connect();
$page = trim($_GET["mpage"], "/");

switch($page){
	case "liturgy/get-slide": include("liturgy/_get_slide.php"); break;
	case "liturgy/get": include("liturgy/_get.php"); break;

	case "song/get":  include("song/_get_song.php"); break;
	case "song/update":  include("song/_set_song.php"); break;

	case "auth/login":  include("auth/_login.php"); break;
	case "auth/check":  include("auth/_check.php"); break;

	case "generator/docx":  include("generator/_docx.php"); break;

	// case "song/update-slide":  include("song/_get_song.php"); break;
	# 403 error by default
	default: header('HTTP/1.1 403 Forbidden'); break;

}
