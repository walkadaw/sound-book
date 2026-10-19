<?php
// The file comes as the raw body: application/octet-stream also keeps cross-site forms out (require_admin_post).
require_admin_post('application/octet-stream');

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
// a file nobody saved a record for is kept this long: the form may still be open, or the song not created yet
const UNUSED_UPLOAD_TTL = 24 * 3600;

$extension = strtolower(pathinfo((string)($_GET['name'] ?? ''), PATHINFO_EXTENSION));
$ref = bin2hex(random_bytes(8)).'.'.$extension;

if (!preg_match(MEDIA_UPLOAD_REF, $ref)) {
    http_response_code(400);
    exit();
}

// A body over post_max_size reaches PHP empty, so the length is checked before reading it.
// The host may set post_max_size below our limit, and then that is the real limit.
if (intval($_SERVER['CONTENT_LENGTH'] ?? 0) > min(MAX_UPLOAD_BYTES, ini_bytes(ini_get('post_max_size')))) {
    http_response_code(413);
    exit();
}

prepare_upload_dir();
delete_stale_uploads($db);

$part = media_upload_path($ref).'.part';
$input = fopen('php://input', 'rb');
$output = fopen($part, 'wb');

// the folder is not writable or the disk is full: the server's fault, not the request's
if (!$output) {
    http_response_code(500);
    exit();
}

// one byte over the limit is enough to tell that the body is too large
$size = stream_copy_to_stream($input, $output, MAX_UPLOAD_BYTES + 1);
fclose($input);
$written = fclose($output);

if ($size === false || !$written) {
    @unlink($part);
    http_response_code(500);
    exit();
}

if (!$size || $size > MAX_UPLOAD_BYTES) {
    unlink($part);
    http_response_code($size ? 413 : 400);
    exit();
}

if (!rename($part, media_upload_path($ref))) {
    @unlink($part);
    http_response_code(500);
    exit();
}

send_gzip(gzencode(json_encode(['ref' => $ref])));

exit();

// The folder is never deployed, so it gets its rules here: only audio is served, nothing runs or gets listed.
function prepare_upload_dir() {
    if (!is_dir(MEDIA_UPLOAD_DIR)) {
        mkdir(MEDIA_UPLOAD_DIR, 0755);
    }

    $htaccess = MEDIA_UPLOAD_DIR.'/.htaccess';
    // mod_rewrite like the site root, since api/.htaccess mixes in the old Order/Deny access syntax
    $rules = implode("\n", [
        'Options -Indexes -ExecCGI',
        'RewriteEngine On',
        'RewriteRule !'.MEDIA_UPLOAD_NAME.' - [R=404,L]',
        '<IfModule mod_headers.c>',
        '    Header set X-Content-Type-Options nosniff',
        '</IfModule>',
        '',
    ]);

    // rewritten when the rules change, since a deploy never reaches this folder
    if (!is_file($htaccess) || file_get_contents($htaccess) !== $rules) {
        file_put_contents($htaccess, $rules);
    }
}

// A php.ini size such as 8M; 0 means no limit.
function ini_bytes($value) {
    $bytes = intval($value);
    $shift = ['K' => 10, 'M' => 20, 'G' => 30][strtoupper(substr(trim((string)$value), -1))] ?? 0;

    return $bytes > 0 ? $bytes << $shift : PHP_INT_MAX;
}

// Files of forms closed without saving and of songs never created, and uploads cut off midway.
function delete_stale_uploads($db) {
    $used = $db->query("SELECT `ref` FROM `sound_media` WHERE `source`='upload'")->fetchAll(PDO::FETCH_COLUMN);
    $used = array_flip($used);

    foreach (glob(MEDIA_UPLOAD_DIR.'/*') as $path) {
        if (!isset($used[basename($path)]) && filemtime($path) < time() - UNUSED_UPLOAD_TTL) {
            unlink($path);
        }
    }
}
