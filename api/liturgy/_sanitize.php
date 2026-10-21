<?php
// The liturgy text is scraped from catholic.by and shown on the site as HTML, so only the markup that the
// lectionary parser (_lectionary.php) relies on survives: paragraphs, line breaks, emphasis,
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

// libxml reads HTML without a charset declaration as Latin-1, so everything past ASCII goes in as numeric entities.
// Its complaints about HTML5 markup are noise here.
function load_html(string $html, int $options = 0): DOMDocument {
    $dom = new DOMDocument('1.0', 'utf-8');
    $useInternalErrors = libxml_use_internal_errors(true);
    $dom->loadHTML(mb_encode_numericentity($html, [0x80, 0x10FFFF, 0, 0x1FFFFF], 'UTF-8'), $options);
    libxml_clear_errors();
    libxml_use_internal_errors($useInternalErrors);

    return $dom;
}

function sanitize_liturgy_html(string $html): string {
    $dom = load_html('<div id="liturgy-root">'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    $root = $dom->getElementById('liturgy-root');

    if (!$root) {
        return '';
    }

    // A snapshot, because unwrapping and removing nodes mutates the live list.
    $nodes = iterator_to_array((new DOMXPath($dom))->query('.//node()', $root));

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

    return children_html($root);
}

function children_html(DOMNode $node): string {
    $result = '';
    foreach ($node->childNodes as $child) {
        $result .= $node->ownerDocument->saveHTML($child);
    }

    // saveHTML writes Cyrillic as numeric entities; turn those back into UTF-8 but keep &lt; and friends
    // escaped, so text can never turn into markup the way html_entity_decode() would let it.
    return preg_replace_callback('/&#(\d+);/', function (array $match): string {
        $code = (int)$match[1];

        return $code > 127 ? mb_chr($code, 'UTF-8') : $match[0];
    }, $result);
}
