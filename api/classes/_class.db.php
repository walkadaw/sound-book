<?php
// The deploy fills in the credentials with sed (.github/workflows/node.js.yml), so keep the `$Name = "value"` lines.
final class db {
    private string $HostDB = "localhost";
    private string $UserDB = "root";
    private string $PassDB = "";
    private string $BaseDB = "sound";

    public function connect(): PDO {
        // utf8mb4: sound_media takes any character, and utf8mb3 tables read back the same through it.
        return new PDO("mysql:host={$this->HostDB};dbname={$this->BaseDB};charset=utf8mb4", $this->UserDB, $this->PassDB, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
