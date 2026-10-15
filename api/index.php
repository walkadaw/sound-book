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

// Admin writes: a signed-in user and a JSON POST, exits with the error status otherwise.
function read_admin_json(){
	start_session();

	if (!isset($_SESSION['user_id'])) {
		http_response_code(403);
		exit();
	}

	if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
		http_response_code(405);
		exit();
	}

	// A cross-site <form> can only send text/plain or form content types, never application/json.
	if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
		http_response_code(415);
		exit();
	}

	$data = json_decode(file_get_contents('php://input'), true);

	if (!is_array($data)) {
		http_response_code(400);
		exit();
	}

	return $data;
}

$db = new db();
$db = $db->connect();
$page = trim($_GET["mpage"], "/");

switch($page){
	case "liturgy/get-slide": include("liturgy/_get_slide.php"); break;
	case "liturgy/get": include("liturgy/_get.php"); break;

	case "song/get":  include("song/_get_song.php"); break;
	case "song/update":  include("song/_set_song.php"); break;
	case "song/stats":  include("song/_stats.php"); break;
	case "song/popular":  include("song/_popular.php"); break;
	case "song/history":  include("song/_history.php"); break;
	case "song/media":  include("song/_media.php"); break;
	case "song/media/save":  include("song/_media_save.php"); break;
	case "song/media/delete":  include("song/_media_delete.php"); break;
	case "song/media/order":  include("song/_media_order.php"); break;

	case "auth/login":  include("auth/_login.php"); break;
	case "auth/check":  include("auth/_check.php"); break;

	// case "song/update-slide":  include("song/_get_song.php"); break;
	# 403 error by default
	default: header('HTTP/1.1 403 Forbidden'); break;

}
