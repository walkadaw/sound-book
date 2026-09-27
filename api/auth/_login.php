<?php
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_SECONDS = 900;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $attemptsFile = __DIR__."/../tmp/_login_".md5($_SERVER['REMOTE_ADDR']).".json";
    $attempts = json_decode(@file_get_contents($attemptsFile), true) ?: ['count' => 0, 'since' => time()];

    if (time() - $attempts['since'] > LOGIN_LOCK_SECONDS) {
        $attempts = ['count' => 0, 'since' => time()];
    }

    if ($attempts['count'] >= LOGIN_MAX_ATTEMPTS) {
        http_response_code(429);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $username = is_string($data["username"] ?? null) ? trim($data["username"]) : '';
    $password = is_string($data["password"] ?? null) ? $data["password"] : '';

    $user = false;
    if ($username !== '' && $password !== '') {
        $sth = $db->prepare("SELECT `id`, `password` FROM `sound_user` WHERE `username`=?");
        $sth->execute([$username]);
        $user = $sth->fetch();
    }

    // Accounts created before the switch to password_hash still store an unsalted md5.
    $isLegacyHash = $user && preg_match('/^[0-9a-f]{32}$/', $user['password']);
    $isValid = $user && ($isLegacyHash
        ? hash_equals($user['password'], md5($password))
        : password_verify($password, $user['password']));

    if (!$isValid) {
        $attempts['count']++;
        file_put_contents($attemptsFile, json_encode($attempts));
        http_response_code(403);
        exit();
    }

    @unlink($attemptsFile);

    if ($isLegacyHash || password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
        upgradePasswordHash($db, $user['id'], $password);
    }

    start_session();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
}

exit();

function upgradePasswordHash($db, $userId, $password){
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // A column sized for md5 would silently truncate the new hash and lock the user out.
    $sth = $db->query("SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sound_user' AND COLUMN_NAME = 'password'");
    if ((int)$sth->fetchColumn() < strlen($hash)) {
        return;
    }

    $db->prepare("UPDATE `sound_user` SET `password`=? WHERE `id`=?")->execute([$hash, $userId]);
}
