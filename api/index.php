<?php
// A PHP message in the body would break the JSON (or a body already declared gzip); errors go to the server log.
ini_set('display_errors', '0');

header('Content-Type: application/json');

require __DIR__.'/classes/_class.db.php';

const ROUTES = [
    'liturgy/get-slide' => 'liturgy/_get_slide.php',
    'liturgy/get' => 'liturgy/_get.php',

    'song/get' => 'song/_get_song.php',
    'song/update' => 'song/_set_song.php',
    'song/stats' => 'song/_stats.php',
    'song/popular' => 'song/_popular.php',
    'song/history' => 'song/_history.php',
    'song/media' => 'song/_media.php',
    'song/media/save' => 'song/_media_save.php',
    'song/media/delete' => 'song/_media_delete.php',
    'song/media/order' => 'song/_media_order.php',
    'song/media/upload' => 'song/_media_upload.php',

    'auth/login' => 'auth/_login.php',
    'auth/check' => 'auth/_check.php',
];

function fail(int $status): never {
    http_response_code($status);
    exit();
}

// Content-Encoding is only valid for bodies that really are gzip; error responses are sent empty.
function send_gzip(string $body): never {
    header('Content-Encoding: gzip');
    echo $body;
    exit();
}

function send_json(mixed $data): never {
    send_gzip(gzencode(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)));
}

// for the nullable INT columns, which may come from the driver as strings
function nullable_int(int|string|null $value): ?int {
    return $value === null ? null : (int)$value;
}

function start_session(): void {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        // Lax keeps the cookie off cross-site POSTs, which is what protects the admin writes from CSRF.
        'samesite' => 'Lax',
    ]);
    session_start();
}

function require_admin(): void {
    start_session();

    if (!isset($_SESSION['user_id'])) {
        fail(403);
    }
}

// Admin writes: a signed-in user and a POST of the given content type, exits with the error status otherwise.
// A cross-site <form> can only send text/plain or form content types, so requiring any other type keeps it out.
function require_admin_post(string $contentType): void {
    require_admin();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail(405);
    }

    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', $contentType) !== 0) {
        fail(415);
    }
}

function read_admin_json(): array {
    require_admin_post('application/json');

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        fail(400);
    }

    return $data;
}

// .htaccess appends the client's query string, so mpage[]=… can turn it into an array
$page = $_GET['mpage'] ?? '';
$route = is_string($page) ? (ROUTES[trim($page, '/')] ?? null) : null;

if ($route === null) {
    fail(403);
}

$db = (new db())->connect();

require __DIR__.'/'.$route;
