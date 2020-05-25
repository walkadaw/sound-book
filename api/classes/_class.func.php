<?PHP
class func{

	
	/*======================================================================*\
	Function:	__construct
	Output:		Нет
	Descriiption: Выполняется при создании экземпляра класса
	\*======================================================================*/
	public function __construct(){
	}
	
	/*======================================================================*\
	Function:	__destruct
	Output:		Нет
	Descriiption: Уничтожение объекта
	\*======================================================================*/
	public function __destruct(){
	
	}
	
	
	function curl($url, $postdata='', $cookie='', $proxy='')
	{
	    $uagent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_7; en-US) AppleWebKit/534.16 (KHTML, like Gecko) Chrome/10.0.648.205 Safari/534.16";
	     
	    $ch = curl_init( $url );
	    curl_setopt($ch, CURLOPT_URL, $url);
	    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);   // возвращает веб-страницу
	    curl_setopt($ch, CURLOPT_HEADER, 0);           // возвращает заголовки
	    @curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);   // переходит по редиректам
	    curl_setopt($ch, CURLOPT_ENCODING, "");        // обрабатывает все кодировки
	    curl_setopt($ch, CURLOPT_USERAGENT, $uagent);  // useragent
	    curl_setopt($ch, CURLOPT_TIMEOUT, 10);        // таймаут ответа
	    curl_setopt($ch, CURLOPT_MAXREDIRS, 10);       // останавливаться после 10-ого редиректа
	    if(!empty($postdata))
	    {
	        curl_setopt($ch, CURLOPT_POST, 1);
	        curl_setopt($ch, CURLOPT_POSTFIELDS, $postdata);
	    }
	    if(!empty($cookie))
	    {
	        //curl_setopt($ch, CURLOPT_COOKIEJAR, $_SERVER['DOCUMENT_ROOT'].'/2.txt');
	        //curl_setopt($ch, CURLOPT_COOKIEFILE,$_SERVER['DOCUMENT_ROOT'].'/2.txt');
	    }
	    $content = curl_exec( $ch );
	    $err     = curl_errno( $ch );
	    $errmsg  = curl_error( $ch );
	    $header  = curl_getinfo( $ch );
	    curl_close( $ch );
	 
	    $header['errno']   = $err;
	    $header['errmsg']  = $errmsg;
	    $header['content'] = $content;
	    return $header;
	}
	
	function parshLiturg($tagiturgia){

		preg_match('#На Імшу(.+?)$#ius', $tagiturgia, $read_list);

		if(count($read_list)) $read_list = $read_list[1]; else $read_list = $tagiturgia;

		$del_text = array("1 чыт.", "2 чыт.", "3 чыт.", "чыт.", "(карац.)", "Ев.", "вечаровая Імша", ";", "\\", "/", ":");
		$read_list = trim(str_replace($del_text, "", "$read_list"));

		$read_list = str_replace("\xc2\xa0", " ", $read_list);

		$space = explode(" ", $read_list);

		$read = [];
		$tmp_text = NULL;

		$i = 0;

		foreach ($space as $key => $value) {
			if($value == "альбо"){ 
				$count = count($read); 
				if($count == 0){
					$read[$i][] = trim($tmp_text, ".");
					$tmp_text = NULL;
					$i = 0;
				}
				if($count == 1){
					$read[$i][] = trim($tmp_text, ".");
					$tmp_text = NULL;
					$i = 0;
				}
				if($count == 2){
					$read[$i][] = trim($tmp_text, ".");
					$tmp_text = NULL;
					$i = 2;
				}
				if($count == 3 or $count == 4){
					if($tmp_text !== NULL){
						$read[$i][] = trim($tmp_text, ".");
						$tmp_text = NULL;
					}
					$i = 3;
				}
				continue; 
			}

			if(mb_strlen($tmp_text) == 1 or (preg_match('/^[а-яёіў.]+$/iu', $tmp_text) and preg_match('/^[а-яёіў.]+$/iu', $value))  ){
				$tmp_text .= " $value";
				continue;
			}
			if(mb_strlen($value) == 1){
				if($tmp_text == NULL) $tmp_text = $value; else $tmp_text .= " ".$value;
				continue;
			}

			if(mb_strlen($value) == 1 or mb_strlen($value) == 0 or (preg_match('/^[а-яёіў.]+$/iu', $value) and mb_strlen($value) > 1) ){

				if($tmp_text){
					$read[$i][] = trim($tmp_text, ".");
					$i++;
					if(mb_strlen($value) == 0){ $tmp_text = NULL; continue; }else $tmp_text = "";

				}
				$tmp_text = "$value";

			}else{
				$tmp_text .= " $value";
			}
		}
		
		$read[$i][] = trim($tmp_text, ".");

		return $read;
	}
	function file_force_download($file, $name) {
	  if (file_exists($file)) {
	    // сбрасываем буфер вывода PHP, чтобы избежать переполнения памяти выделенной под скрипт
	    // если этого не сделать файл будет читаться в память полностью!
	    if (ob_get_level()) {
	      ob_end_clean();
	    }
	    // заставляем браузер показать окно сохранения файла
	    header('Content-Description: File Transfer');
	    header('Content-Type: application/octet-stream');
	    header('Content-Disposition: attachment; filename=' . basename("$name"));
	    header('Content-Transfer-Encoding: binary');
	    header('Expires: 0');
	    header('Cache-Control: must-revalidate');
	    header('Pragma: public');
	    header('Content-Length: ' . filesize($file));
	    // читаем файл и отправляем его пользователю
	    readfile($file);

	    unlink($file);
	    exit;
	  }
	}
}
?>