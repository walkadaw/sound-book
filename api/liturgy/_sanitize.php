<?php
// The liturgy text is scraped from catholic.by and shown on the site as HTML, so only the markup that the
// page and the slide parser (_get_slide.php) rely on survives: paragraphs, line breaks, emphasis,
// span.divider and div[align]. Other elements are unwrapped to their text; active content is dropped whole.
const LITURGY_ALLOWED_ATTRIBUTES = [
	'p' => [],
	'br' => [],
	'b' => [],
	'strong' => [],
	'i' => [],
	'em' => [],
	'sup' => [],
	'sub' => [],
	'span' => ['class'],
	'div' => ['align'],
];
const LITURGY_DROPPED_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'noscript', 'template', 'svg', 'math'];

function sanitize_liturgy_html($html) {
	$dom = new DOMDocument('1.0', 'utf-8');
	@$dom->loadHTML(
		'<div id="liturgy-root">'.mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8').'</div>',
		LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
	);
	$root = $dom->getElementById('liturgy-root');

	if (!$root) {
		return '';
	}

	// A snapshot, because unwrapping and removing nodes mutates the live list.
	$nodes = [];
	foreach ((new DOMXPath($dom))->query('.//node()', $root) as $node) {
		$nodes[] = $node;
	}

	foreach ($nodes as $node) {
		if (!$node->parentNode) {
			continue;
		}

		if ($node instanceof DOMComment || $node instanceof DOMProcessingInstruction) {
			$node->parentNode->removeChild($node);
			continue;
		}

		if (!($node instanceof DOMElement)) {
			continue;
		}

		$tag = strtolower($node->tagName);

		if (in_array($tag, LITURGY_DROPPED_TAGS, true)) {
			$node->parentNode->removeChild($node);
			continue;
		}

		if (!array_key_exists($tag, LITURGY_ALLOWED_ATTRIBUTES)) {
			while ($node->firstChild) {
				$node->parentNode->insertBefore($node->firstChild, $node);
			}
			$node->parentNode->removeChild($node);
			continue;
		}

		foreach (iterator_to_array($node->attributes) as $attribute) {
			if (!in_array(strtolower($attribute->name), LITURGY_ALLOWED_ATTRIBUTES[$tag], true)) {
				$node->removeAttribute($attribute->name);
			}
		}
	}

	$result = '';
	foreach ($root->childNodes as $child) {
		$result .= $dom->saveHTML($child);
	}

	// saveHTML writes Cyrillic as numeric entities; turn those back into UTF-8 but keep &lt; and friends
	// escaped, so text can never turn into markup the way html_entity_decode() would let it.
	return preg_replace_callback('/&#(\d+);/', function ($m) {
		$code = (int)$m[1];
		return $code > 127 ? mb_chr($code, 'UTF-8') : $m[0];
	}, $result);
}
