<?php
start_session();

if (!isset($_SESSION['user_id'])) {
    fail(401);
}

exit();
