<?PHP
// Run by cron through the CLI only; over HTTP anyone could trigger the scrape.
if (PHP_SAPI !== 'cli') {
	http_response_code(403);
	exit();
}
# Автоподгрузка классов
spl_autoload_register(function ($name) {
	include dirname(__DIR__)."/classes/_class.".$name.".php";
});
require __DIR__.'/_sanitize.php';
//Чтобы небыло косяков со временем.
date_default_timezone_set('Europe/Minsk');

# Функции
$func = new func;
# База данных
$dbInstance = new db;
$db = $dbInstance->connect();

//Ищим ссылку на литургию
//Открываем каленарь литургии
$result = $func->curl("https://catholic.by/3/liturgy/lit-calendar?filterdate=".date("Y-n"));
$dom = new DOMDocument('1.0', 'utf-8');
@$dom->loadHTML(mb_convert_encoding($result["content"], 'HTML-ENTITIES', 'UTF-8'));
//Создаем XPath object 
$xpath = new DomXPath($dom);

$href = $xpath->query("//div[contains(@class,'artlititem')]//div[contains(@class,'artlitdate') and contains(., '".date("d.m.Y")."')]/..//div[@class='artlitreadings']//a/@href");

//Получаем сегоняшний чтение в сокращении
$artlitreadings = $xpath->query("//div[contains(@class,'artlititem')]//div[contains(@class,'artlitdate') and contains(., '".date("d.m.Y")."')]/..//div[contains(@class,'artlitreadings')]");

//Сокращенное теги на писание
foreach ($artlitreadings as $key => $h2) { $liturgia[$key]["readings"] = $h2->nodeValue; }

$url = [];
foreach ($href as $urln) { $url[] = $urln->nodeValue; }

foreach ($url as $key => $value) {
	//Открываем литургию
	$result = $func->curl("https://catholic.by".$value);

	$dom = new DOMDocument('1.0', 'utf-8');
	@$dom->loadHTML(mb_convert_encoding($result["content"], 'HTML-ENTITIES', 'UTF-8'));
	//Создаем XPath object 
	$xpath = new DomXPath($dom);

	$title = $xpath->query("//div[@class='page-header']");
	foreach ($title as $h2) { $title = $h2->nodeValue; }

	$tags = $xpath->query("//div[@class='article']");
	foreach ($tags as $tag) {
	    $article = '';

	    $children = $tag->childNodes;
	    foreach ($children as $child) {
	        $tmp_doc = new DOMDocument('1.0', 'utf-8');
	        $tmp_doc->appendChild($tmp_doc->importNode($child,true));       
	        $article .= $tmp_doc->saveHTML();
	    }
	}
	$article = sanitize_liturgy_html($article);
	$tmp = '';
	$article = preg_replace_callback(
		"#Рэфрэн:(.+?)(<br>|</p>)#is",
		function($m) use (&$ref) {
			if (!empty(strip_tags($m[1]))) {
				$ref = $m[0];
			}
			return empty($ref) ? $m[0] : $ref;
		},
		$article);

	$liturgia[$key]["title"] = trim($title);
	$liturgia[$key]["article"] = trim($article);

}

// A failed scrape (site down, markup changed) keeps yesterday's reading instead of an empty page.
$liturgia = array_filter($liturgia ?? [], function ($value) {
	return !empty($value["article"]);
});
if (!$liturgia) {
	exit(1);
}

$insert = $db->prepare("INSERT INTO `liturgy` (`artlitreadings`, `title`, `article`) VALUES (?, ?, ?)");

// DELETE rather than TRUNCATE: TRUNCATE commits implicitly, so a failing insert would still wipe the table.
$db->beginTransaction();
$db->exec("DELETE FROM `liturgy`");
foreach ($liturgia as $value) {
	$article = str_replace(['\n','\r'], '', $value["article"]);
	$insert->execute([$value["readings"] ?? '', $value["title"] ?? '', $article]);
}
$db->commit();
