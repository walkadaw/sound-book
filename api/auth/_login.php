<?php
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_SECONDS = 900;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405);
}

$attemptsFile = __DIR__.'/../tmp/_login_'.md5($_SERVER['REMOTE_ADDR']).'.json';
$attemptsHandle = fopen($attemptsFile, 'c+');

// Without the counter there is no limit on guesses, so no sign-in at all.
if (!$attemptsHandle) {
    fail(500);
}

// Held until the password is checked (exit releases it), so parallel guesses from one address are counted one by one.
flock($attemptsHandle, LOCK_EX);
$attempts = json_decode(stream_get_contents($attemptsHandle), true);

if (!is_array($attempts) || time() - $attempts['since'] > LOGIN_LOCK_SECONDS) {
    $attempts = ['count' => 0, 'since' => time()];
}

if ($attempts['count'] >= LOGIN_MAX_ATTEMPTS) {
    fail(429);
}

$data = json_decode(file_get_contents('php://input'), true);
$username = is_string($data['username'] ?? null) ? trim($data['username']) : '';
$password = is_string($data['password'] ?? null) ? $data['password'] : '';

$user = false;
if ($username !== '' && $password !== '') {
    $sth = $db->prepare("SELECT `id`, `password` FROM `sound_user` WHERE `username`=?");
    $sth->execute([$username]);
    $user = $sth->fetch();
}

if (!$user || !password_verify($password, $user['password'])) {
    $attempts['count']++;
    ftruncate($attemptsHandle, 0);
    rewind($attemptsHandle);
    fwrite($attemptsHandle, json_encode($attempts));
    fail(403);
}

// emptied rather than deleted: a request waiting for the lock already holds this file open
ftruncate($attemptsHandle, 0);

// PHP 8.4 raised the default bcrypt cost, so hashes made before it are redone on the next sign-in.
if (password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
    upgrade_password_hash($db, $user['id'], $password);
}

start_session();
session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];

exit();

function upgrade_password_hash(PDO $db, int $userId, string $password): void {
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // A newer default algorithm may produce a hash longer than the column; truncating it would lock the user out.
    $sth = $db->query("SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sound_user' AND COLUMN_NAME = 'password'");
    if ((int)$sth->fetchColumn() < strlen($hash)) {
        return;
    }

    $db->prepare("UPDATE `sound_user` SET `password`=? WHERE `id`=?")->execute([$hash, $userId]);
}
