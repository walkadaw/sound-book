<?php
// Turns catholic.by pages into today's readings. The calendar lists the masses of the day; a lectionary
// page holds the texts of one mass, often for several liturgical years at once ("Год І" and "Год ІІ" on
// weekdays, "ЕВАНГЕЛЛЕ Ў ГОД А" at the Easter Vigil), and only the current year's texts are kept.

require_once __DIR__.'/_sanitize.php';

// checked in order: "ЕВАНГЕЛЛЕМ" in the acclamation header starts like the gospel one
const SECTION_HEADERS = [
    'acclamation' => '/^СПЕЎ ПЕРАД ЕВАНГЕЛЛЕМ/u',
    'gospel' => '/^ЕВАНГЕЛЛЕ(\s|$)/u',
    'psalm' => '/^(\d+\s+)?РЭСПАНСАРЫЙНЫ ПСАЛЬМ/u',
    'sequence' => '/^СЕКВЕНЦЫЯ/u',
    'reading' => '/^(\S+ ЧЫТАННЕ|ЭПІСТАЛА)$/u',
];

// Year marks are sometimes typed with Latin letters that look like Cyrillic ones.
const YEAR_LETTERS = ['A' => 'А', 'B' => 'В', 'C' => 'С', 'I' => 'І'];

/** @return array{sunday: string, weekday: string} the Sunday cycle (А, В, С) and the weekday one (І, ІІ) */
function liturgical_year(DateTimeImmutable $date): array {
    $year = (int)$date->format('Y');

    // The liturgical year is named after the calendar year it ends in and starts on the First Sunday of Advent,
    // the Sunday from 27 November to 3 December.
    $advent = new DateTimeImmutable("$year-11-27");
    $advent = $advent->format('N') === '7' ? $advent : $advent->modify('next sunday');

    if ($date->setTime(0, 0) >= $advent) {
        $year++;
    }

    return ['sunday' => ['С', 'А', 'В'][$year % 3], 'weekday' => $year % 2 ? 'І' : 'ІІ'];
}

/**
 * The masses of the day in the calendar order, separated there by "альбо". Masses without a lectionary
 * page (most optional memorials list only the references) are left out.
 *
 * @return array{readings: string, href: string}[]
 */
function calendar_options(string $html, string $date): array {
    $xpath = new DOMXPath(load_html($html));
    $day = $xpath->query("//div[contains(@class,'artlititem')][div[contains(@class,'artlitdate') and contains(., '$date')]]")->item(0);
    $options = [[]];

    foreach ($day?->childNodes ?? [] as $node) {
        if (!($node instanceof DOMElement)) {
            continue;
        }

        $class = $node->getAttribute('class');

        if (str_contains($class, 'artlitalso')) {
            $options[] = [];
        } elseif (str_contains($class, 'artlitreadings')) {
            $options[array_key_last($options)] = [
                'readings' => normalize_space($node->textContent),
                'href' => $xpath->query('.//a/@href', $node)->item(0)?->nodeValue ?? '',
            ];
        }
    }

    return array_values(array_filter($options, fn(array $option) => ($option['href'] ?? '') !== ''));
}

/**
 * A page usually holds one mass; Christmas holds three, each after a centered "Імша ўначы" line,
 * and the calendar links all three options to the same page.
 *
 * @return array{title: string, masses: array{name: string, sections: array{type: string, title: string, reference: string, blocks: array{kind: string, lines: string[]}[]}[]}[]}
 */
function lectionary_page(string $html, array $year): array {
    $xpath = new DOMXPath(load_html($html));
    $article = fill_refrains(sanitize_liturgy_html(inner_html(last_node($xpath->query("//div[@class='article']")))));
    $parts = preg_split('#<div align="center">\s*<i>\s*(Імша[^<]*?)\s*</i>\s*</div>#u', $article, -1, PREG_SPLIT_DELIM_CAPTURE);
    $masses = [['name' => '', 'sections' => lectionary_sections($parts[0], $year)]];

    for ($i = 1; $i < count($parts); $i += 2) {
        $masses[] = ['name' => normalize_space($parts[$i]), 'sections' => lectionary_sections($parts[$i + 1], $year)];
    }

    return [
        'title' => normalize_space(last_node($xpath->query("//div[@class='page-header']"))?->textContent ?? ''),
        // the text before the first mass is a table of contents
        'masses' => array_values(array_filter($masses, fn(array $mass) => $mass['sections'])),
    ];
}

/**
 * The mass of a page that a calendar option stands for: the one its reading list names ("Імша ўначы: ..."),
 * or else the one at the option's place among the options linking to the same page.
 *
 * @return ?array{title: string, sections: array[]}
 */
function option_mass(array $page, string $readings, int $position): ?array {
    $masses = $page['masses'];
    $mass = null;

    if (count($masses) === 1) {
        $mass = $masses[0];
    } elseif (preg_match('/^(Імша[^:]*):/u', $readings, $match)) {
        $name = mb_strtolower(trim($match[1], ' .'));
        $mass = array_find($masses, fn(array $item) => mb_strtolower(trim($item['name'], ' .')) === $name);
    }

    $mass ??= $masses[$position] ?? null;

    if ($mass === null) {
        return null;
    }

    return [
        'title' => count($masses) > 1 && $mass['name'] !== '' ? "{$page['title']} ({$mass['name']})" : $page['title'],
        'sections' => $mass['sections'],
    ];
}

/** @return array{type: string, title: string, reference: string, blocks: array{kind: string, lines: string[]}[]}[] */
function lectionary_sections(string $article, array $year): array {
    $sections = [];
    // A "Год І" mark covers the sections after it up to the next mark, or up to a section of a type the
    // previous year's block did not have: on weekdays the acclamation and gospel after "Год ІІ" are common.
    $block = null;
    $blockTypes = [];
    $previousBlockTypes = [];
    // the procession's own gospels come before the mass, whose gospel is the one with the "e" slide
    $procession = null;

    foreach (preg_split('#<span class="divider">.*?</span>#is', $article) as $chunk) {
        $part = lectionary_part($chunk);

        if ($part['mark'] !== null) {
            $previousBlockTypes = $block === null ? [] : $blockTypes;
            $block = $part['mark'];
            $blockTypes = [];
        }

        if ($part['rite'] !== null) {
            $procession = $part['rite'] === 'ІМША' ? null : $part['rite'];
        }

        if ($procession !== null && $part['type'] === 'gospel') {
            $part['type'] = 'procession';
            $part['title'] = $procession;
        } elseif ($part['type'] !== null) {
            $procession = null;
        }

        if ($part['type'] === null) {
            // text after a divider without a header of its own continues the section before it
            if ($sections && has_text($part['html'])) {
                $sections[array_key_last($sections)]['html'] .= $part['html'];
            }

            continue;
        }

        if ($block !== null && $part['mark'] === null && $previousBlockTypes && !in_array($part['type'], $previousBlockTypes, true)) {
            $block = null;
        }

        if ($block !== null) {
            $blockTypes[] = $part['type'];
        }

        $sections[] = [...$part, 'year' => $part['year'] ?? $block];
    }

    $years = array_values($year);
    $marked = array_values(array_filter(array_column($sections, 'year')));
    // A mark nobody expects (a typo, a year the page does not have) should not empty the day: then the first one wins.
    $keep = array_intersect($marked, $years) ? $years : array_slice($marked, 0, 1);

    $sections = array_filter($sections, fn(array $section) => $section['year'] === null || in_array($section['year'], $keep, true));

    return array_values(array_map(fn(array $section) => [
        'type' => $section['type'],
        'title' => $section['title'],
        'reference' => $section['reference'],
        'blocks' => section_blocks($section['html']),
    ], $sections));
}

/**
 * One piece of the article between dividers, with its header, year mark and reference taken out of the text.
 *
 * "ПРАЦЭСІЯ З ПАЛЬМАМІ" and "ІМША" on Palm Sunday open the procession and the mass after it.
 *
 * @return array{mark: ?string, rite: ?string, type: ?string, title: string, year: ?string, reference: string, html: string}
 */
function lectionary_part(string $chunk): array {
    $dom = load_html('<div id="liturgy-part">'.$chunk.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    $root = $dom->getElementById('liturgy-part');
    $xpath = new DOMXPath($dom);
    $part = ['mark' => null, 'rite' => null, 'type' => null, 'title' => '', 'year' => null, 'reference' => '', 'html' => ''];

    if (!$root) {
        return $part;
    }

    foreach (iterator_to_array($xpath->query('.//b', $root)) as $bold) {
        $text = normalize_space($bold->textContent);

        if (preg_match('/^Год\s+([ІIАВСABC]+)$/u', $text, $match)) {
            $part['mark'] = strtr($match[1], YEAR_LETTERS);
        } elseif (preg_match('/^ПРАЦЭСІЯ/u', $text) || $text === 'ІМША') {
            $part['rite'] = $text;
        } elseif ($part['type'] === null && ($type = section_type($text)) !== null) {
            $part['type'] = $type;
            $title = preg_replace('/^\d+\s+/u', '', $text);

            if (preg_match('/^(.+?)\s+Ў\s+ГОД\s+(\S+)$/u', $title, $match)) {
                $title = $match[1];
                $part['year'] = strtr($match[2], YEAR_LETTERS);
            }

            $part['title'] = $title;
        } else {
            continue;
        }

        $bold->parentNode->removeChild($bold);
    }

    // The first right-aligned block with text is the Bible reference; the empty ones only make space.
    foreach (iterator_to_array($xpath->query('.//div[@align]', $root)) as $div) {
        $text = normalize_space($div->textContent);

        if ($text === '' || ($part['reference'] === '' && $div->getAttribute('align') === 'right')) {
            $part['reference'] = $part['reference'] ?: $text;
            $div->parentNode->removeChild($div);
        }
    }

    foreach (iterator_to_array($xpath->query(".//i[contains(., 'Пераклад здзейснены')]", $root)) as $node) {
        $node->parentNode->removeChild($node);
    }

    $part['html'] = children_html($root);

    return $part;
}

/**
 * The text of a section as blocks of lines. A line keeps only bold and italics, as HTML.
 *
 * @return array{kind: string, lines: string[]}[]
 */
function section_blocks(string $html): array {
    $blocks = [];

    foreach (html_line_groups($html) as $group) {
        if (array_all($group, 'is_italic_line')) {
            // the subtitle and the rubrics, told apart below
            $blocks[] = ['kind' => 'italic', 'lines' => $group];
            continue;
        }

        $text = [];
        $flush = function () use (&$blocks, &$text): void {
            if ($text) {
                $blocks[] = ['kind' => 'text', 'lines' => $text];
                $text = [];
            }
        };

        foreach ($group as $index => $line) {
            $plain = plain_text($line);

            if (str_starts_with($plain, 'Рэфрэн:')) {
                // the refrain takes the rest of its paragraph: "Або: Аллелюя."
                $flush();
                $lines = array_filter([strip_label($line, 'Рэфрэн:'), ...array_slice($group, $index + 1)]);
                $blocks[] = ['kind' => 'refrain', 'lines' => array_values($lines)];
                break;
            }

            $kind = match (true) {
                str_starts_with($plain, 'Акламацыя:') => 'acclamation',
                !has_text(preg_replace('#<b>.*?</b>#su', '', $line)) && preg_match('/^(\+\s*)?(Чытанне|Пачатак|Мука)\s/u', $plain) => 'intro',
                (bool)preg_match('/^Гэта слова (Божае|Пана)\.?$/u', $plain) => 'conclusion',
                default => null,
            };

            if ($kind === null) {
                $text[] = $line;
                continue;
            }

            $flush();
            $blocks[] = ['kind' => $kind, 'lines' => [$kind === 'acclamation' ? strip_label($line, 'Акламацыя:') : $line]];
        }

        $flush();
    }

    // Before the opening line ("Чытанне кнігі…") come the subtitle, set in italics right above it, and the rubrics;
    // before the Passion, the key to its speaker marks too. Elsewhere italics stand for rubrics and subheadings.
    $intro = array_find_key($blocks, fn(array $block) => $block['kind'] === 'intro');

    foreach ($blocks as $index => &$block) {
        if ($intro !== null && $index < $intro) {
            $block['kind'] = $block['kind'] === 'italic' && $index === $intro - 1 ? 'subtitle' : 'rubric';
        } elseif ($block['kind'] === 'italic') {
            $block['kind'] = 'rubric';
        }

        // the site styles these by their kind; only the text and the sung lines keep their own bold and italics
        if (in_array($block['kind'], ['subtitle', 'intro', 'rubric', 'conclusion'], true)) {
            $block['lines'] = array_map(fn(string $line) => trim(strip_tags($line)), $block['lines']);
        }
    }
    unset($block);

    return $blocks;
}

/**
 * Paragraphs as groups of lines: a paragraph or a blank line ends a group, a <br> ends a line.
 * Bold and italics running over a line break are closed and reopened, so each line stands on its own.
 *
 * @return string[][]
 */
function html_line_groups(string $html): array {
    $html = str_replace(['<strong>', '</strong>', '<em>', '</em>'], ['<b>', '</b>', '<i>', '</i>'], $html);
    $html = preg_replace('#</?span[^>]*>|\s+#u', ' ', $html);
    $html = preg_replace(['#</?(p|div)[^>]*>#', '#<br>#'], ["\n\n", "\n"], $html);

    $groups = [[]];
    $open = [];

    foreach (explode("\n", $html) as $line) {
        $line = implode('', array_map(fn(string $tag) => "<$tag>", $open)).$line;

        preg_match_all('#<(/?)(b|i|sup|sub)>#', $line, $tags, PREG_SET_ORDER);
        $open = [];
        foreach ($tags as [, $closing, $tag]) {
            if ($closing === '') {
                $open[] = $tag;
            } elseif (($key = array_search($tag, array_reverse($open, true), true)) !== false) {
                unset($open[$key]);
            }
        }
        $open = array_values($open);

        $line = inline_html($line);

        if ($line !== '') {
            $groups[array_key_last($groups)][] = $line;
        } elseif ($groups[array_key_last($groups)]) {
            $groups[] = [];
        }
    }

    return array_values(array_filter($groups));
}

// A line with its stray closing tags dropped and the open ones closed; empty when it has no text.
function inline_html(string $html): string {
    $dom = load_html('<div id="liturgy-line">'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    $root = $dom->getElementById('liturgy-line');
    $html = $root ? children_html($root) : '';
    $html = preg_replace('#<(b|i|sup|sub)>[\s\x{a0}]*</\1>#u', '', $html);

    return has_text($html) ? preg_replace('#^[\s\x{a0}]+|[\s\x{a0}]+$#u', '', $html) : '';
}

// Set in italics, maybe with a bold title in it: "<i>Чытаецца калекта і гімн</i> <b>«Хвала на вышынях Богу…»</b>".
function is_italic_line(string $line): bool {
    $rest = preg_replace('#<i>.*?</i>#su', '', $line);

    return $rest !== $line && !has_text(preg_replace('#<b>.*?</b>#su', '', $rest));
}

// "Рэфрэн:" and "Акламацыя:" are shown by the site itself, in bold.
function strip_label(string $line, string $label): string {
    return inline_html(preg_replace('#^\s*(<b>)?\s*'.preg_quote($label, '#').'\s*(</b>)?#u', '', $line));
}

function plain_text(string $html): string {
    return normalize_space(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function section_type(string $header): ?string {
    foreach (SECTION_HEADERS as $type => $pattern) {
        if (preg_match($pattern, $header)) {
            return $type;
        }
    }

    return null;
}

function normalize_space(string $text): string {
    return trim(preg_replace('/[\s\x{a0}]+/u', ' ', $text));
}

function last_node(DOMNodeList $nodes): ?DOMNode {
    return $nodes->item($nodes->length - 1);
}

// Each child is saved as a document of its own: unlike saveHTML($node), that keeps the line breaks between blocks.
function inner_html(?DOMNode $node): string {
    $html = '';

    foreach ($node?->childNodes ?? [] as $child) {
        $document = new DOMDocument('1.0', 'utf-8');
        $document->appendChild($document->importNode($child, true));
        $html .= $document->saveHTML();
    }

    return $html;
}

// The refrain is printed in full once and later often as a bare "Рэфрэн:"; those get the words of the last full one.
function fill_refrains(string $html): string {
    $refrain = null;
    $refrainEnd = null;

    return preg_replace_callback('#Рэфрэн:(.+?)(<br>|</p>)#is', function (array $match) use (&$refrain, &$refrainEnd, $html): string {
        [$text, $offset] = $match[0];

        if (!has_text($match[1][0])) {
            return $refrain ?? $text;
        }

        // A psalm may offer a second refrain printed right after the first; the repeats keep the first.
        if ($refrainEnd === null || has_text(substr($html, $refrainEnd, $offset - $refrainEnd))) {
            $refrain = $text;
        }

        $refrainEnd = $offset + strlen($text);

        return $text;
    }, $html, flags: PREG_OFFSET_CAPTURE);
}

// a bare "Рэфрэн: </b>" still holds a space, often a non-breaking one
function has_text(string $html): bool {
    return trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'), " \t\r\n\u{a0}") !== '';
}
