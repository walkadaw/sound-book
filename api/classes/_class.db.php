<?PHP
class db {
	public $HostDB = "localhost";
	public $UserDB = "root";
	public $PassDB = "";
	public $BaseDB = "sound";
	public $CharsetDB = "utf8";

	function connect() {
		$dsn = "mysql:host=$this->HostDB;dbname=$this->BaseDB;charset=$this->CharsetDB";
		$opt = [
			PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
			PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
			PDO::ATTR_EMULATE_PREPARES   => false,
		];
		return new PDO($dsn, $this->UserDB, $this->PassDB, $opt);
	}
}
