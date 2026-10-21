<?php
require __DIR__.'/_media_files.php';

// The file comes as the raw body: application/octet-stream also keeps cross-site forms out (require_admin_post).
require_admin_post('application/octet-stream');

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
// a file nobody saved a record for is kept this long: the form may still be open, or the song not created yet
const UNUSED_UPLOAD_TTL = 24 * 3600;

$extension = strtolower(pathinfo((string)($_GET['name'] ?? ''), PATHINFO_EXTENSION));
$ref = bin2hex(random_bytes(8)).'.'.$extension;

if (!preg_match(MEDIA_UPLOAD_REF, $ref)) {
    fail(400);
}

// A body over post_max_size reaches PHP empty, so the length is checked before reading it.
// The host may set post_max_size below our limit, and then that is the real limit (0 means no limit).
$postMaxSize = ini_parse_quantity(ini_get('post_max_size')) ?: PHP_INT_MAX;
if (intval($_SERVER['CONTENT_LENGTH'] ?? 0) > min(MAX_UPLOAD_BYTES, $postMaxSize)) {
    fail(413);
}

prepare_upload_dir();
delete_stale_uploads($db);

$part = media_upload_path($ref).'.part';
$input = fopen('php://input', 'rb');
$output = fopen($part, 'wb');

// the folder is not writable or the disk is full: the server's fault, not the request's
if (!$output) {
    fail(500);
}

// one byte over the limit is enough to tell that the body is too large
$size = stream_copy_to_stream($input, $output, MAX_UPLOAD_BYTES + 1);
fclose($input);
$written = fclose($output);

if ($size === false || !$written) {
    @unlink($part);
    fail(500);
}

if (!$size || $size > MAX_UPLOAD_BYTES) {
    unlink($part);
    fail($size ? 413 : 400);
}

if (!rename($part, media_upload_path($ref))) {
    @unlink($part);
    fail(500);
}

send_json(['ref' => $ref]);

// The folder is never deployed, so it gets its rules here: only audio is served, nothing runs or gets listed.
function prepare_upload_dir(): void {
    if (!is_dir(MEDIA_UPLOAD_DIR)) {
        mkdir(MEDIA_UPLOAD_DIR, 0755);
    }

    $htaccess = MEDIA_UPLOAD_DIR.'/.htaccess';
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

// Files of forms closed without saving and of songs never created, and uploads cut off midway.
function delete_stale_uploads(PDO $db): void {
    $used = array_flip($db->query("SELECT `ref` FROM `sound_media` WHERE `source`='upload'")->fetchAll(PDO::FETCH_COLUMN));

    foreach (glob(MEDIA_UPLOAD_DIR.'/*') ?: [] as $path) {
        if (!isset($used[basename($path)]) && filemtime($path) < time() - UNUSED_UPLOAD_TTL) {
            unlink($path);
        }
    }
}
