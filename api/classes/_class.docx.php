<?PHP
class docx{
	
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
	/*======================================================================*\
	Function:	genDocX
	Output:	нЕт	
	Descriiption: Генерация docX фаила
	\*======================================================================*/
	function genDocX($data, $option = ["isShowChord" => true, "isShowTag" => true]){

		$start = file_get_contents('./xml/start.xml', FILE_USE_INCLUDE_PATH);               
		$title = file_get_contents('./xml/title.xml', FILE_USE_INCLUDE_PATH);
		$chord_xml = file_get_contents('./xml/chord.xml', FILE_USE_INCLUDE_PATH); 
		$chastki = file_get_contents('./xml/chastki.xml', FILE_USE_INCLUDE_PATH); 
		$gadzinki = file_get_contents('./xml/gadzinki.xml', FILE_USE_INCLUDE_PATH); 
		$ending = file_get_contents('./xml/end.xml', FILE_USE_INCLUDE_PATH);   

		$songText = "";  
		//Список ID для генерации имени
		$nameid = ""; 

		//Для нумерации списков
		$number = 6;
		$number_tarck_id = 0;

		foreach ($data as $row) {

		$nameid .=	$row["id"];
		    
		$icon = "";

		if($option["isShowTag"]){

			$_tag = explode(",", $row["tag"]);

			if(count($_tag) > 0){
				$icon .= '<w:r w:rsidR="00FE0DCA" w:rsidRPr="00FE0DCA"><w:tab /></w:r>';
			}
			
			foreach ($_tag as $value) {
				//Делаем проблем после текста
				$rID = $value - 1;
				if($value > 0)
				$icon .= '<w:r w:rsidR="00600401"><w:rPr><w:caps w:val="0" /></w:rPr><w:pict><v:shape id="_x0000_i1025" type="#_x0000_t75" style="width:17pt;height:17pt"><v:imagedata r:id="rId1'.$rID.'" o:title="Тег" /></v:shape></w:pict></w:r>';
			}

		}
		
		$tmpTaC = str_replace( '{ID}', $row["id"], $title );
		$songText .= str_replace( ['{TITLE}','{ICON}'], [html_entity_decode($row["title"]), $icon], $tmpTaC );


		if($option["isShowChord"]){

			$songText .= $chord_xml;

			// Разбор аккордов и выстраивает xml разметки для WORD
			$chord =  explode("<br />", nl2br(html_entity_decode(strip_tags($row["chord"]))));
			$end = 0;
			$startTag = 0;
			foreach ($chord as $key => $value) {

			    $value = trim($value);
			    if($end == 1){
			        if(strlen($value) > 0)
			            $songText .= "<w:br/></w:t></w:r>";
			        else
			            $songText .= "</w:t></w:r>";
			        $end = 0;
			    }

			    if($startTag == 0){
			        $startTag = 1;
			        $songText .= '<w:p><w:pPr><w:pStyle w:val="a7"/><w:framePr w:hSpace="0" w:wrap="auto" w:vAnchor="margin" w:hAnchor="text" w:xAlign="left" w:yAlign="inline"/></w:pPr>';
			    }

			    if(strlen($value) > 0 ) { 
			    	
			    	$songText .= "<w:r><w:t>{$value}";

				  	$end = 1;
			    }else{
			        if($startTag == 1){
			            $songText .= "</w:p>";
			            $startTag = 0;
			        }
			    }
			 
			}
			if($end == 1){
			    $songText .= "</w:t></w:r>";
			}
			if($startTag == 1){
			    $songText .= "</w:p>";
			}

			$songText .= "</w:tc></w:tr></w:tbl>";

		}
		/********END GEN CHORD*********/


		$text =  explode("<br />", nl2br(html_entity_decode(strip_tags($row["text"]))));
		$tmp = 0;
		$end = 0;


		    foreach ($text as $key => $value) {
		    $value = preg_replace('@\x{2003}@u', ' ', $value);
		    $value = trim($value);
		        if($end == 1 and strlen($value) > 0){
		        
		            $songText .= "<w:br/></w:t></w:r>";

		            $end = 0;
		        }
		        if(strlen($value) > 0){
		            if($tmp == 0){
		                $tmp = 1;
		                $songText .= "<w:p>";
		                if(intval($value) > 0 and strlen($value) > 0)  {
		                	
		                	$songText .= "<w:pPr><w:pStyle w:val=\"a\"/>";

		                	if($number_tarck_id != $row["id"]){
  								$songText .=  "<w:numPr><w:ilvl w:val=\"0\" /><w:numId w:val=\"".$number."\" /></w:numPr>";

  								$number++;
  								$number_tarck_id = $row["id"];
		                	}
		                    $songText .= "</w:pPr>";
		                    
		                    $value = preg_replace('/^\d./i', '', $value);
		                   
		                }else{
		                    $songText .= "<w:pPr><w:lastRenderedPageBreak/></w:pPr>";
		                }
		            }

		            $songText .= "<w:r w:rsidRPr=\"005B6BAA\"><w:t>{$value}";
		            $end = 1;
		        }else{
		           
		            if($end == 1){
		                $tmp = 0;
		                $end = 0;
		                $songText .= "</w:t></w:r></w:p>";
		            }
		        }
		    }

		    if($tmp == 1 or $end == 1){
		        $songText .= "</w:t></w:r></w:p>";
		    }
		}


		//Ср=обираем все в кучю
		$file = $start . $songText;
		if($option["isAddChastki"]) $file .= $chastki;
		if($option["isAddGadzinki"]) $file .= $gadzinki;
		$file .= $ending;
		// Делаем копию основы в временный каталог
		
		$name_file = "sb".md5($nameid).".docx";
		copy('xml/sb.docx', 'tmp/'.$name_file);

		//инициализируем ZIP архив
		$zip = new ZipArchive;
		$res = $zip->open('./tmp/'.$name_file, ZipArchive::CREATE);

		//Добавляем полученный фаил в архив
		if ($res === TRUE) {
		    $zip->addFromString('word/document.xml', $file);
		    $zip->close();
		    //Выдаем полученный фаил для скачивания
		    return $name_file;
		}else{
		    return false;
		}
	}
}