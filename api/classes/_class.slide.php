<?PHP
class slide{

	public $type = "16:9"; # Соотношение страрон экрана
	public $max_string_lityrgia; # Количество символов
	
	/*======================================================================*\
	Function:	__construct
	Output:		Нет
	Descriiption: Выполняется при создании экземпляра класса
	\*======================================================================*/
	public function __construct($type = "16:9"){
		$this->type = $type;

		if($type == "16:9"){
			$this->max_string_lityrgia = 285;
		}else{
			$this->max_string_lityrgia = 195;
		}
	}
	
	/*======================================================================*\
	Function:	__destruct
	Output:		Нет
	Descriiption: Уничтожение объекта
	\*======================================================================*/
	public function __destruct(){
	
	}
	/*======================================================================*\
	Function:	song
	Output:		$text Текст песни
	Descriiption: Разбивает текст на строки и обварачивает разметкой для слайдов повер поинт
	\*======================================================================*/
	function song($text, $id = NULL , $title = NULL){

		$slide = '';
		$count = 0;
		$start = 0;
		$br = 0;
		$line = 0;
		$line_p = 0;
		//Текс по умолчанию
		$fontsize = 50;

		$text_array = explode("\n\r", html_entity_decode(stripcslashes($text)) );   
		foreach($text_array as $value){

			$value = trim(nl2br($value));

			if($value){

				$t_string = array_filter(explode("<br />", $value));
				$t_line_c = count($t_string);

				//Разбивка если слишком большое количество строк на меньшее
				$count_str = iconv_strlen($value,'UTF-8');


				$lineEnd = -1;
				if($t_line_c > 6 or $count_str > 250) $lineEnd = round($t_line_c/2);

				if($line > 0) $line_p++;
				$tmp_line_p = 0;
				foreach($t_string as $string){
					$tmp_line_p++;
					if(iconv_strlen($string,'UTF-8') >= 39){
						$tmp_line_p++;
					}
				}

				$line_p += $tmp_line_p;

				//Можно 9 линей
				//echo $line_p." ".$t_line_c."}";

				//Склейка слайдов при необходимости
				if( (($line_p > 9) or ($t_line_c + $line > 6) ) and $slide){
					$allSlide[] = ['fontSize' => $fontsize, 'text' => $slide];
					$slide = "";

					//$lineEnd = -1;
					$line_p = $tmp_line_p;
					$line = 0;
					$count = 0;
					$start = 0;
					$br = 0;

				}else{
					if($start == 1){
						$start = 0;
					}
					if($line > 0){
						$slide .= "\n\n";
						$br = 0;
					}
				}

				

				$tmp_line_p = 0;
				foreach($t_string as $string){
					$tmp_line_p++;
					if(iconv_strlen($string,'UTF-8') >= 39){
						$tmp_line_p++;
					}
					//Если много букв то разбиваем на два слайда
					if($count_str > 130){

						if($line == $lineEnd){
							$allSlide[] = ['fontSize' => $fontsize, 'text' => $slide];
							$slide = "";

							$lineEnd = -1;
							$line_p = $tmp_line_p;
							$line = 0;
							$count = 0;
							$start = 0;
							$br = 0;
						}

					}
					//END
					

					$string = preg_replace( '@^(<br\\b[^>]*/?>)+@i', '', $string );
					$string = trim($string);

					if(intval($string) > 0){
						  $string = ltrim(preg_replace('/^\d./i', '', $string));
					}
				   
					if($count < iconv_strlen($string,'UTF-8')){

						$count = iconv_strlen($string,'UTF-8');
						if($count < 34) $fontsize = 60; 
						else if($count >= 34 and $count < 38) $fontsize = 58;
						else if($count >= 38 and $count < 42) $fontsize = 56;
						else if($count >= 42 and $count < 50) $fontsize = 54;
						else $fontsize = 52;
					}

					if($string){
						
						if($start == 1){
							$slide .= "\n";
							$start = 0;
							$br = 0;
						}

						if($start == 0){
							 $start = 1;
							 $line++;
						}

						$slide .= $string;
						
					}else{
						$br++;

						if($br == 2){
							$slide .= "\n";
							$start = 0;
							$br = 0;
							$line++;
						}
					}
				}
			}
			
				if($start == 1){
					$start = 0;
				}

		}
		if($slide){
			$allSlide[] = ['fontSize' => $fontsize, 'text' => $slide];
		}

		return $allSlide;
	}

	function gen_linurgia($data, $id = NULL , $title = NULL){
		$allSlide = [];

		$max_string = $this->max_string_lityrgia;

		$slide = "";

		$data = str_replace(array("\r","\n"),"",$data);
		//$text = preg_replace('|(?s)<div.*?<\/div>|', '', $data);
		$text = preg_replace('|^.*?Чытанне.*?<\/p>|i', '', $data);

		$text = trim(strip_tags($text));
		$predlog_string = preg_split("~(.*?[.?!:,-])~",$text,-1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_DELIM_CAPTURE);

		//определяем длину строки
		$string = NULL;
		$line = 0;
		$str_count_all = 0;

		$start = 0;
		$br = 0;

		foreach($predlog_string as $pred){ 

			$pred = trim($pred);
			//Считаем
			$str_count = iconv_strlen($pred, 'UTF-8');

			//Если предложение не влазит то вставляе его по словам
			if( $str_count_all + $str_count > $max_string) { 

				if($str_count_all <= intval($this->max_string_lityrgia/2)){

					$t_string = explode(" ", $pred);
					if(is_array($t_string)){
						
						foreach($t_string as $word){ 
							if($str_count_all + iconv_strlen($word,'UTF-8') + 1 >= $max_string){
								
								$slide .= trim($string); 

								$string = NULL;
								$str_count_all = 0;
							
								$allSlide[] = ['fontSize' => 54, 'text' => $slide];
								$slide = NULL;
							}


							$string .= $word." ";
							$str_count_all += iconv_strlen($word,'UTF-8') + 1;
						}
					}
				}else{
					$slide .= trim($string); 

					$string = NULL;
					$str_count_all = 0;

					$allSlide[] = ['fontSize' => 54, 'text' => $slide];
					$slide = NULL;

					$string .= $pred." ";
				    $str_count_all += $str_count;
				}
				

			}else{
				$string .= $pred." ";
				$str_count_all += $str_count;
			}
		}
		if($string){
			if($start == 0){
				$start = 1;
			}

			$slide .= $string;
		}
		if($slide)	$allSlide[] = ['fontSize' => 54, 'text' => $slide];
		
		return $allSlide;
	}

	function psalm($text, $id = NULL , $title = NULL){

		$allSlide = [];
		$slide = null;
		preg_match("#Рэфрэн:(.+?)(<br>|</p>)#is", $text, $refren);

		$text = str_replace($refren[0], 'Рэфрэн:</b><br></p>',$text);
		$text = str_replace('Рэфрэн:',strip_tags($refren[0]), $text);
		$text = str_replace('Рэфрэн:', "", $text);

		$text = preg_replace('|(?s)<div.*?<\/div>|', '', $text);

		$text = str_replace(array("</p>","<br>"), "|", $text);
		$text = strip_tags($text);
		$text = str_replace("|||", "||", $text);

		$string = explode("|", $text);

		$line = 0;
		$start = 0;
		$br = 0;

		foreach ($string as $value) {
			$value = trim($value);

			if(!$line == 0 or $value){

				$value = ltrim(preg_replace('/^\d./i', '', $value)," .");

				if($start == 1){
					$start = 0;
					$br = 1;
				}

				if(!$value and $line > 0){
					if($line > 3){
						$allSlide[] = ['fontSize' => 50, 'text' => $slide];
						$slide = NULL;
						$br = 0;
						$start = 0;
						$line = 0;
					}else{
						$slide .= "\n\n";
						$br = 0;
					}
				}else{
					if($br == 1){
						$slide .= "\n";
						$br = 0;
					}
					if($star == 0){
						$start = 1;
					}
					$slide .= $value;
				}

				$line++;
			}

		}
		if($slide and $line > 3){
			$allSlide[] = ['fontSize' => 50, 'text' => $slide];
		}

		return $allSlide;
	}

	function gen_songeva($text, $id = NULL , $title = NULL){

		$allSlide = [];
		$slide = null;
		$text = str_replace('Акламацыя:', "", $text);
		$text = preg_replace('|<div\s.*?right.*?>(.*?)<\/div>|', '<br>', $text);

		$text = str_replace(array("</p>","<br>"), "|", $text);
		$text = strip_tags($text);
		
		$string = explode("|", $text);
		$line = 0;
		$start = 0;
		$br = 0;

		foreach ($string as $value) {
			$value = trim($value);

			if(!$line == 0 or $value){

				$value = trim(preg_replace('/^\d./i', '', $value)," .;*");

				if($start == 1){
					$start = 0;
					$br = 1;
				}

				if(!$value and $line > 0){
					if($line > 4){
						$allSlide[] = ['fontSize' => 50, 'text' => $slide];
						$slide = null;
						$br = 0;
						$start = 0;
						$line = 0;
					}else{
						$slide .= "\n\n";
						$br = 0;
					}
				}else{
					if($br == 1){
						$slide .= "\n";
						$br = 0;
					}
					if($star == 0){
						$start = 1;
					}
					$slide .= $value;
				}

				$line++;
			}

		}
		if($slide and $line > 3){
			$allSlide[] = ['fontSize' => 50, 'text' => $slide];
		}

		return $allSlide;
			
	}
	function genLitur($liturgia, $read, $type = "pptx"){

		$counList = count($read);
		$trueLit = array();
		//Первое читанне
		$key = $this->saerch_key_liturgia($liturgia[1][1], $read[0]);
		if($key !== FALSE){
			$trueLit[] = [
						"id" => "r1",
						"title" => "ПЕРШАЕ ЧЫТАННЕ",
						"slides" => $this->gen_linurgia($liturgia[1][1][$key], "r1", "ПЕРШАЕ ЧЫТАННЕ"),
					];
		}

		//Псальм
		$key = $this->saerch_key_liturgia($liturgia[3][1], $read[1]);
		if($key !== FALSE){
			$trueLit[] = [
				"id" => "p1",
				"title" => "РЭСПАНСАРЫЙНЫ ПСАЛЬМ",
				"slides" => $this->psalm($liturgia[3][1][$key], "p1", "РЭСПАНСАРЫЙНЫ ПСАЛЬМ"),
			];
		}

		//Вторпое читание
		if($counList > 3){
			$key = $this->saerch_key_liturgia($liturgia[1][1], $read[2]);
			if($key !== FALSE){
				$trueLit[] = [
					"id" => "r2",
					"title" => "ДРУГОЕ ЧЫТАННЕ",
					"slides" => $this->gen_linurgia($liturgia[1][1][$key], "r2", "ДРУГОЕ ЧЫТАННЕ"),
				];
			}
		}
		// Если у нас 3 читанне 3 псальма
		if($counList > 5){
			//второй псальм
			$key = $this->saerch_key_liturgia($liturgia[3][1], $read[3]);
			if($key !== FALSE){
				$trueLit[] = [
					"id" => "p2",
					"title" => "РЭСПАНСАРЫЙНЫ ПСАЛЬМ",
					"slides" => $this->psalm($liturgia[3][1][$key], "p2", "РЭСПАНСАРЫЙНЫ ПСАЛЬМ"),
				];
			}

			//Третье читание
			$key = $this->saerch_key_liturgia($liturgia[1][1], $read[4]);
			if($key !== FALSE){
				$trueLit[] = [
					"id" => "r3",
					"title" => "ТРЭЦЯЕ ЧЫТАННЕ",
					"slides" => $this->gen_linurgia($liturgia[1][1][$key], "r3", "ТРЭЦЯЕ ЧЫТАННЕ"),
				];
			}

			//третий псальм
			$key = $this->saerch_key_liturgia($liturgia[3][1], $read[5]);
			if($key !== FALSE){
				$trueLit[] = [
					"id" => "p3",
					"title" => "РЭСПАНСАРЫЙНЫ ПСАЛЬМ",
					"slides" => $this->psalm($liturgia[3][1][$key], "p3", "РЭСПАНСАРЫЙНЫ ПСАЛЬМ"),
				];
			}

			//Еванилье
			$key = $this->saerch_key_liturgia($liturgia[5][1], $read[6]);
			if($key !== FALSE){
				//ЕВАНГЕЛЛЕ
				$trueLit[] = [
					"id" => "e",
					"title" => "ЕВАНГЕЛЛЕ",
					"slides" => $this->gen_linurgia($liturgia[5][1][$key], "e", "ЕВАНГЕЛЛЕ"),
				];
			}


		}

		if($counList == 4){
			//Еванилье
			$key = $this->saerch_key_liturgia($liturgia[5][1], $read[3]);
			if($key !== FALSE){
				//Спеу перед евангелле
				$trueLit[] = [
					"id" => "es",
					"title" => "СПЕЎ ПЕРАД ЕВАНГЕЛЛЕ",
					"slides" => $this->gen_songeva($liturgia[4][1][$key], "es", "СПЕЎ ПЕРАД ЕВАНГЕЛЛЕ"),
				];
				//ЕВАНГЕЛЛЕ
				$trueLit[] = [
					"id" => "e",
					"title" => "ЕВАНГЕЛЛЕ",
					"slides" => $this->gen_linurgia($liturgia[5][1][$key], "e", "ЕВАНГЕЛЛЕ"),
				];

			}

		}else if($counList == 3){
			//Еванилье
			$key = $this->saerch_key_liturgia($liturgia[5][1], $read[2]);
			if($key !== FALSE){
				//Спеу перед евангелле
				$trueLit[] = [
					"id" => "es",
					"title" => "СПЕЎ ПЕРАД ЕВАНГЕЛЛЕ",
					"slides" => $this->gen_songeva($liturgia[4][1][$key], "es", "СПЕЎ ПЕРАД ЕВАНГЕЛЛЕ"),
				];
				//ЕВАНГЕЛЛЕ
				$trueLit[] = [
					"id" => "e",
					"title" => "ЕВАНГЕЛЛЕ",
					"slides" => $this->gen_linurgia($liturgia[5][1][$key], "e", "ЕВАНГЕЛЛЕ"),
				];
			}
		}

		return $trueLit;

	}

	//Меняем похожие символы в одну расклаку
	function lang_eng_by($text){
		$text = mb_strtolower($text);

		$eng_list = ["a", "b", "c", "y", "k", "p", "i", "e", "m"];
		$by_list = ["а", "в", "с", "у", "к", "р", "", "е", "м"];
		return str_replace($eng_list, $by_list, $text);
	}
	//Ищем вхожденей по сокращениеям в литургии
	function saerch_key_liturgia($liturgia, $metka){
		$del_text = array(",", "(", ")",".","-","–","—","–"," "," ","\xc2\xa0", ";",":","?");

		foreach ($liturgia as $key => $value) {
			preg_match("#<div.*?>(.*?)<*\/*div#is", $value, $value);
			
			$value = $this->lang_eng_by(str_replace($del_text, "", strip_tags($value[1])));

			if(!is_array($metka)){
				$metka = $this->lang_eng_by(str_replace($del_text, "", $metka));

				if(strpos($value, $metka) !== false){
					return $key;
				}
			}else{

				foreach ($metka as $metkaArr) {

					$metka = $this->lang_eng_by(str_replace($del_text, "", $metkaArr));
					if(strpos($value, $metka) !== false){
						return $key;
					}
				}
			}
			
		}
		return false;

	}

	/*======================================================================*\
	Function:	genSlide
	Output:		$explode Парядок вывода слайдов, $slides Все слайды, $title Названия песен для груперовки
	Descriiption: Собирает воедино все слады
	\*======================================================================*/
	function genSlide($explode, $slides){

		$i=1;
		$filename = "";
		foreach ($explode as $value) {
			$filename .= $value;
		}

		$filename = "slide".md5($filename).".pptx";
		//Делаем копию основы в временный коталог
		copy('xml/slide/2.pptx', 'tmp/'.$filename);

		//инифизируем ZIP архив
		$zip = new ZipArchive;
		$res = $zip->open('./tmp/'.$filename, ZipArchive::CREATE);

		//Добовляем полученный фаил в архив
		if ($res === TRUE) {

			$ContentType_xml = file_get_contents('./xml/slide/[Content_Types].xml', FILE_USE_INCLUDE_PATH);               
			$_rels_xml = file_get_contents('./xml/slide/_rels/.rels', FILE_USE_INCLUDE_PATH);
			$presentation_xml_rels = file_get_contents('./xml/slide/ppt/_rels/presentation.xml.rels', FILE_USE_INCLUDE_PATH);

			if($this->type == "16:9"){
				$slideEXT = '<a:ext cx="12192000" cy="6858000"/>';
				$presentation_xml = file_get_contents('./xml/slide/ppt/presentation16.xml', FILE_USE_INCLUDE_PATH);
			}else{
				$slideEXT = '<a:ext cx="9144000" cy="6858000"/>';
				$presentation_xml = file_get_contents('./xml/slide/ppt/presentation4.xml', FILE_USE_INCLUDE_PATH);
			}

			$slide_xml_rels = file_get_contents('./xml/slide/ppt/slides/_rels/slide1.xml.rels', FILE_USE_INCLUDE_PATH);            
			$slide_xml = file_get_contents('./xml/slide/ppt/slides/slide1.xml', FILE_USE_INCLUDE_PATH);   

			foreach ($explode as $values) {

				foreach ($slides[$values]["slides"] as $key => $value) {

					
					$rId = $i + 10;
					$sldId = $i + 256;

					//[Content_Types].xml
					$ContentType .= '<Override PartName="/ppt/slides/slide'.$i.'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';
					//ppt/_rels/presentation.xml.rels
					$Relationship .= '<Relationship Id="rId'.$rId.'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide'.$i.'.xml"/>';
					//ppt/presentation.xml
					$presenation .= '<p:sldId id="'.$sldId.'" r:id="rId'.$rId.'"/>';

					//СОздает разделы
					if($presentation_grop_id !== NULL and $values != $tmpV){

						$md5 = mb_strtoupper(md5($i));
						$tmpVID = substr($md5, 0,8)."-".substr($md5, 8,4)."-".substr($md5, 12,4)."-".substr($md5, 16,4)."-".substr($md5, 20,12);
	  
						//$tmpVID = $tmpV + 100;
						$presentation_grop .= '<p14:section name="'.$slides[$tmpV]["title"].'" id="{'.$tmpVID.'}"><p14:sldIdLst>'.$presentation_grop_id.'</p14:sldIdLst></p14:section>';

						$presentation_grop_id = NULL;
					}
					$tmpV = $values;
					$presentation_grop_id .= '<p14:sldId id="'.$sldId.'"/>';

					 $fSlide = str_replace( ['{text-slide}', '{border-text}'], [$value, $slideEXT], $slide_xml );

					 $zip->addFromString('ppt/slides/slide'.$i.'.xml', $fSlide);
					 $zip->addFromString('ppt/slides/_rels/slide'.$i.'.xml.rels', $slide_xml_rels);

					 $i++;
				}
			  


			}

			//СОздает разделы
			$md5 = mb_strtoupper(md5($i));
			$tmpVID = substr($md5, 0,8)."-".substr($md5, 8,4)."-".substr($md5, 12,4)."-".substr($md5, 16,4)."-".substr($md5, 20,12);

			$presentation_grop .= '<p14:section name="'.$slides[$tmpV]["title"].'" id="{'.$tmpVID.'}"><p14:sldIdLst>'.$presentation_grop_id.'</p14:sldIdLst></p14:section>';
		
			//[Content_Types].xml
			$tmp = str_replace( '{slide-list}', $ContentType, $ContentType_xml );
			$zip->addFromString('[Content_Types].xml', $tmp);

			//ppt/_rels/presentation.xml.rels
			$tmp = str_replace( '{relationship-slide}', $Relationship, $presentation_xml_rels );
			$zip->addFromString('ppt/_rels/presentation.xml.rels', $tmp);

			//ppt/presentation.xml
			$tmp = str_replace( '{slide-list}', $presenation, $presentation_xml );
			$tmp = str_replace( '{slide-group}', $presentation_grop, $tmp );
			
			$zip->addFromString('ppt/presentation.xml', $tmp);

			$zip->close();
			return $filename;
		}else{
			return false;
		}

	}
	
}