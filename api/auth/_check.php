<?php
start_session();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    exit();
}

exit();
