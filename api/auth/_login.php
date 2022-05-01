<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
   
    $username = addslashes(trim($data["username"]));
    $password = md5($data["password"]);
    
    if (!isset($username) || !isset($password)){
        http_response_code(403);
        exit(403);
    }

    $sth = $db->prepare("SELECT `id`, `password` FROM `sound_user` WHERE `username`=?");
    $sth->execute([$username]);
    $data = $sth->fetch();

    if (isset($data) && $data['password'] === $password) {
        session_start();
        $_SESSION['user_id'] = $data['id'];
    } else {
        http_response_code(403);
        exit(403);
    }
    
}

exit();
