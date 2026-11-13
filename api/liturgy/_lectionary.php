<?php
// Turns catholic.by pages into today's readings. The calendar lists the masses of the day; a lectionary
// page holds the texts of one mass, often for several liturgical years at once ("Год І" and "Год ІІ" on
// weekdays, "ЕВАНГЕЛЛЕ Ў ГОД А" at the Easter Vigil), and only the current year's texts are kept.
//
// The pages are typed by hand in different editors, so their markup is no guide: one puts the reference in a
// right-aligned div and a span.divider before each section, another (pasted from Word Online) wraps every word in
// a tag of its own and has neither. The article is therefore flattened into plain lines first, and the sections,
// references and alternatives are told apart by their words.

const LITURGY_SITE = 'https://catholic.by';

// A page that parsed into something not fit to show; the day is left out and asked for again on the next run.
class LiturgyException extends RuntimeException {}

// The header words, checked in order: "ЕВАНГЕЛЛЕМ" in the acclamation header starts like the gospel one.
const SECTION_HEADERS = [
    'acclamation' => 'СПЕЎ ПЕРАД ЕВАНГЕЛЛЕМ',
    'gospel' => 'ЕВАНГЕЛЛЕ',
    'psalm' => 'РЭСПАНСАРЫЙНЫ ПСАЛЬМ',
    'sequence' => 'СЕКВЕНЦЫЯ',
    'reading' => '[А-ЯЁІЎ]+ ЧЫТАННЕ|ЭПІСТАЛА',
];

// Year marks are sometimes typed with Latin letters that look like Cyrillic ones.
const YEAR_LETTERS = ['A' => 'А', 'B' => 'В', 'C' => 'С', 'I' => 'І'];

// "Эф 1, 3–6. 11–12", "1 Мак 1, 10–15", "Пс Лк 1, 46–47", "Пс 146 (145), 6c–7", "Пс 116В (115)", "Флм 7–20"
const BIBLE_REFERENCE = '/^(\d\s*)?[А-ЯЁІЎ][а-яёіў]{0,5}\.?(\s+[А-ЯЁІЎ][а-яёіў]{0,5}\.?)?:?\s+\d+[a-zA-Zа-яА-Я]?\s*(\(\d+\)\s*)?([,–-]|$)/u';

// "Год І", "Год А." and, for a set of readings that may be chosen in that year, "Або на выбар у год B:"
const YEAR_MARK = '/^(?:Або на выбар у\s+)?[Гг]од\s+([ІIАВСABC]+)[.:]?$/u';

// The line between two texts read in the same place, either of which may be chosen.
const ALTERNATIVE = '/^(або|альбо)[.:]?$/iu';

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
 * The masses of a day with a lectionary page, null when a page of the day did not download: the day is then
 * left for the next run rather than stored without one of its masses.
 *
 * $fetch gives the HTML of a catholic.by path, or null when it did not download. A mass that parsed into something
 * not fit to show is left out, the other masses of the day stay.
 *
 * @return ?array{readings: string, url: string, title: string, sections: array[]}[]
 */
function day_liturgy(string $calendar, DateTimeImmutable $date, callable $fetch): ?array {
    $year = liturgical_year($date);
    $liturgy = [];
    // options of one page (the Christmas masses) share the download
    $pages = [];
    $positions = [];

    foreach (calendar_options($calendar, $date->format('d.m.Y')) as $option) {
        $href = $option['href'];
        $positions[$href] = ($positions[$href] ?? -1) + 1;

        if (!array_key_exists($href, $pages)) {
            $html = $fetch($href);

            if ($html === null) {
                return null;
            }

            $pages[$href] = lectionary_page($html, $year);
        }

        // the masses of All Souls' Day are all of the day, for the priest to choose, though the calendar cites the first;
        // they are added once, however many options link the page
        $masses = $pages[$href]['choices']
            ? ($positions[$href] > 0 ? [] : array_map(fn(array $mass) => titled_mass($pages[$href], $mass), $pages[$href]['masses']))
            : array_filter([option_mass($pages[$href], $option['readings'], $positions[$href])]);

        foreach ($masses as $mass) {
            try {
                check_mass($mass['sections'], LITURGY_SITE.$href);
                $liturgy[] = ['readings' => $option['readings'], 'url' => LITURGY_SITE.$href, ...$mass];
            } catch (LiturgyException) {
                continue;
            }
        }
    }

    return $liturgy;
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
 * A page usually holds one mass. Christmas holds three and the great solemnities a vigil mass and a mass of the day,
 * each after an italic "Імша ўначы" or "Імша ў вігілію" line, and the calendar links all of them to the same page.
 * All Souls' Day holds three masses to choose from, after "Першая Імша", "Другая Імша" and "Трэцяя Імша".
 *
 * @return array{title: string, choices: bool, masses: array{name: string, sections: array[]}[]}
 */
function lectionary_page(string $html, array $year): array {
    $xpath = new DOMXPath(load_html($html));
    $article = last_node($xpath->query("//div[@class='article']"));
    $lines = fill_refrains(join_refrain_choices($article ? (new ArticleLines())->read($article) : []));
    $masses = [['name' => '', 'lines' => []]];

    foreach ($lines as $line) {
        // the table of contents above lists them in plain text
        if (preg_match('/^(Імша(\s+\S+){1,3}|(Першая|Другая|Трэцяя)\s+Імша)\.?$/u', $line['text']) && is_italic_line($line['html'])) {
            $masses[] = ['name' => $line['text'], 'lines' => []];
        } else {
            $masses[array_key_last($masses)]['lines'][] = $line;
        }
    }

    $masses = array_map(fn(array $mass) => ['name' => $mass['name'], 'sections' => lectionary_sections($mass['lines'], $year)], $masses);
    // the text before the first mass is a table of contents
    $masses = array_values(array_filter($masses, fn(array $mass) => $mass['sections']));

    return [
        'title' => normalize_space(last_node($xpath->query("//div[@class='page-header']"))?->textContent ?? ''),
        'choices' => count($masses) > 1 && array_all($masses, fn(array $mass) => preg_match('/^(Першая|Другая|Трэцяя)\s+Імша/u', $mass['name'])),
        'masses' => $masses,
    ];
}

// A mass of the page, named after the page and, when the page holds several, after its own name too.
function titled_mass(array $page, array $mass): array {
    return [
        'title' => count($page['masses']) > 1 && $mass['name'] !== '' ? "{$page['title']} ({$mass['name']})" : $page['title'],
        'sections' => $mass['sections'],
    ];
}

/**
 * The mass of a page that a calendar option stands for: the one its reading list names ("Імша ўначы: ..."), else
 * the one whose readings the list cites (the vigil of Saints Peter and Paul is listed on the day before, without a
 * name), else the one at the option's place among the options linking to the same page.
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

    if ($mass === null && count($masses) > 1) {
        $scores = array_map(fn(array $item) => cited_readings($item['sections'], $readings), $masses);
        $best = max($scores);

        if ($best > 0 && count(array_keys($scores, $best, true)) === 1) {
            $mass = $masses[array_search($best, $scores, true)];
        }
    }

    $mass ??= $masses[$position] ?? null;

    return $mass === null ? null : titled_mass($page, $mass);
}

// How many texts of a mass the calendar's reading list cites, by their book and chapter: "Дз 12, 1–11" by "Дз 12".
function cited_readings(array $sections, string $readings): int {
    $cited = 0;

    foreach ($sections as $section) {
        foreach ([$section, ...$section['alternatives']] as $text) {
            if (!preg_match('/^((?:\d\s*)?[А-ЯЁІЎ][а-яёіў]{0,5})\.?\s+(\d+)/u', $text['reference'], $match)) {
                continue;
            }

            $book = preg_replace('/^(\d)\s*/u', '$1\s*', preg_quote($match[1], '/'));
            $cited += preg_match('/(^|[^А-ЯЁІЎа-яёіў])'.$book.'\.?\s+'.$match[2].'(?!\d)/u', $readings);
        }
    }

    return $cited;
}

/**
 * The article as lines with bold and italics only, each knowing whether it opens a paragraph, whether a
 * span.divider stands before it and how its div is aligned. A paragraph, a div, a list item, a divider and an
 * empty line open a paragraph; a <br> ends a line. Neighbouring runs of the same emphasis are joined, so
 * "<b>Рэфрэн</b><b>:</b>" reads as "<b>Рэфрэн:</b>", and a run of only spaces is a plain space.
 *
 * The site shows the lines as HTML, and they are safe to: they are made of escaped text and the emphasis tags
 * alone, and the text of active content is never read.
 */
final class ArticleLines {
    private const INLINE = ['b' => 'b', 'strong' => 'b', 'i' => 'i', 'em' => 'i', 'sup' => 'sup', 'sub' => 'sub'];
    // Word pastes text in tables too, and a cell ends a line as a paragraph does
    private const BLOCK = ['p', 'div', 'li', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];
    private const SKIPPED = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'noscript', 'template', 'svg', 'math'];

    private array $lines = [];
    private string $line = '';
    private bool $paragraph = true;
    private bool $divider = false;
    private string $align = '';

    public function read(DOMNode $root): array {
        $this->walk($root, []);
        $this->end(true);

        return $this->lines;
    }

    private function walk(DOMNode $node, array $inline): void {
        foreach ($node->childNodes as $child) {
            if ($child instanceof DOMText) {
                $this->text($child->data, $inline);
                continue;
            }

            if (!($child instanceof DOMElement)) {
                continue;
            }

            $tag = strtolower($child->tagName);

            if (in_array($tag, self::SKIPPED, true)) {
                continue;
            }

            if ($tag === 'br') {
                $this->end(false);
            } elseif ($tag === 'span' && str_contains($child->getAttribute('class'), 'divider')) {
                // its letter is the site's mark for a slide, not text
                $this->end(true);
                $this->divider = true;
            } elseif (isset(self::INLINE[$tag])) {
                $this->walk($child, [...$inline, self::INLINE[$tag]]);
            } elseif (in_array($tag, self::BLOCK, true)) {
                $this->end(true);
                $align = $this->align;
                $this->align = ($tag === 'div' ? $child->getAttribute('align') : '') ?: $align;
                $this->walk($child, $inline);
                $this->end(true);
                $this->align = $align;
            } else {
                $this->walk($child, $inline);
            }
        }
    }

    private function text(string $text, array $inline): void {
        $text = preg_replace('/[\s\x{a0}]+/u', ' ', $text);

        if (trim($text) === '') {
            $this->line .= $text;
            return;
        }

        $tags = array_unique($inline);
        $open = implode('', array_map(fn(string $tag) => "<$tag>", $tags));
        $close = implode('', array_map(fn(string $tag) => "</$tag>", array_reverse($tags)));
        $this->line .= $open.htmlspecialchars($text, ENT_NOQUOTES | ENT_HTML5, 'UTF-8').$close;
    }

    // An empty line between two others opens a paragraph, as a blank line does in print. The translators' note under
    // each text counts as empty, and so does the site's slide mark, a lone "а" or "ф", when it stands outside its
    // span.divider (sometimes typed as a Latin "a").
    private function end(bool $paragraph): void {
        $html = join_runs($this->line);
        $text = plain_text($html);
        $this->line = '';

        if ($html === '' || str_contains($text, 'Пераклад здзейснены') || preg_match('/^[аaфf]$/u', $text)) {
            $this->paragraph = true;
            return;
        }

        $this->lines[] = [
            'html' => $html,
            'text' => $text,
            'paragraph' => $this->paragraph,
            'divider' => $this->divider,
            'align' => $this->align,
        ];
        $this->paragraph = $paragraph;
        $this->divider = false;
    }
}

// Joins neighbouring runs of the same emphasis and trims the line; empty when there is no text.
function join_runs(string $html): string {
    do {
        $html = preg_replace('#</(b|i|sup|sub)>(\s*)<\1>#u', '$2', $html, -1, $count);
    } while ($count);

    $html = preg_replace('/ {2,}/', ' ', $html);

    return has_text($html) ? trim($html) : '';
}

/**
 * A second refrain is printed in several ways; each becomes an "Або: …" line in the paragraph of the first one:
 * "Рэфрэн: A" then "Або: B" or "Рэфрэн: B" as paragraphs of their own, or "Рэфрэн: A", "Або:", "Рэфрэн: B".
 * An "Або:" line followed by the second refrain's verse, "(Р.: 9а)", adds it to the reference above.
 */
function join_refrain_choices(array $lines): array {
    $fullRefrain = fn(array $line) => (bool)preg_match('/^Рэфрэн:\s*\S/u', $line['text']);
    $choice = fn(array $line) => (bool)preg_match('/^Або:\s*\S/u', $line['text']);
    $joined = [];
    // the last line kept is a refrain with its words, or a choice already joined to one
    $afterRefrain = false;

    for ($i = 0; $i < count($lines); $i++) {
        $line = $lines[$i];
        $next = $lines[$i + 1] ?? null;

        if (preg_match(ALTERNATIVE, $line['text']) && $next) {
            // the verse of the second refrain goes to the psalm's reference, not to one of an earlier section
            $reference = null;

            foreach (array_reverse($joined, true) as $key => $item) {
                if ($item['align'] === 'right') {
                    $reference = $key;
                    break;
                }

                if ($item['divider'] || section_header($item['html']) !== null) {
                    break;
                }
            }

            if ($reference !== null && preg_match('/^\(Р\.:.*\)$/u', $next['text'])) {
                $joined[$reference]['text'] .= " або {$next['text']}";
                $joined[$reference]['html'] .= ' або '.htmlspecialchars($next['text'], ENT_NOQUOTES | ENT_HTML5, 'UTF-8');
                $i++;
                continue;
            }

            if ($afterRefrain && $fullRefrain($next)) {
                continue;
            }
        }

        if ($afterRefrain && $fullRefrain($line)) {
            $html = '<b>Або:</b> '.strip_label($line['html'], 'Рэфрэн:');
            $line = [...$line, 'html' => $html, 'text' => plain_text($html)];
        }

        if ($afterRefrain && $choice($line)) {
            $line['paragraph'] = false;
        } else {
            $afterRefrain = $fullRefrain($line);
        }

        $joined[] = $line;
    }

    return $joined;
}

// The refrain is printed in full once and later often as a bare "Рэфрэн:"; those get the words of the last full one.
// A psalm may offer a second refrain printed right after the first; the repeats keep the first.
function fill_refrains(array $lines): array {
    $refrain = null;
    $afterRefrain = false;

    foreach ($lines as &$line) {
        if (!str_starts_with($line['text'], 'Рэфрэн:')) {
            $afterRefrain = false;
            continue;
        }

        if (trim(mb_substr($line['text'], mb_strlen('Рэфрэн:'))) === '') {
            if ($refrain !== null) {
                $line = [...$line, 'html' => $refrain['html'], 'text' => $refrain['text']];
            }
        } elseif (!$afterRefrain) {
            $refrain = $line;
        }

        $afterRefrain = true;
    }
    unset($line);

    return $lines;
}

/**
 * The sections of one mass. A header line opens a section, unless it repeats the header of the section before it
 * right after an "Або:" line: then it brings another text for the same place. "Год І" and "ПРАЦЭСІЯ З ПАЛЬМАМІ"
 * lines belong to the section after them. The lines before a header and after the last divider (the rubrics before
 * the Passion) belong to that header's section; before the first header, only the italic ones (the note that opens
 * the Easter Vigil), not the title of the day or the contents. Lines followed by a divider before any header continue
 * the section before them, or are left out when there is none yet.
 *
 * @return array{type: string, title: string, reference: string, blocks: array[], alternatives: array{reference: string, blocks: array[]}[]}[]
 */
function lectionary_sections(array $lines, array $year): array {
    $parts = [];
    $mark = null;
    $rite = null;
    // the lines since the last divider while no header has come after it
    $pending = [];
    $headed = false;
    $flush = function () use (&$parts, &$pending): void {
        if ($parts) {
            array_push($parts[array_key_last($parts)]['lines'], ...$pending);
        }

        $pending = [];
    };

    foreach ($lines as $line) {
        if ($line['divider']) {
            $flush();
            $headed = false;
        }

        if (preg_match(YEAR_MARK, $line['text'], $match)) {
            $mark = strtr($match[1], YEAR_LETTERS);
        } elseif (preg_match('/^ПРАЦЭСІЯ/u', $line['text']) || $line['text'] === 'ІМША') {
            $rite = $line['text'];
        } elseif (($header = section_header($line['html'])) !== null) {
            $last = $parts ? $parts[array_key_last($parts)] : null;
            $before = $pending ?: ($last ? $last['lines'] : []);

            if ($last && $last['type'] === $header['type'] && $last['year'] === $header['year'] && $before && preg_match(ALTERNATIVE, end($before)['text'])) {
                // "Або:" and the same header again: another text for the same place, with its reference if on the line
                $reference = $header['reference'] === '' ? [] : [['html' => $header['reference'], 'text' => $header['reference'], 'paragraph' => true, 'divider' => false, 'align' => 'right']];
                array_push($parts[array_key_last($parts)]['lines'], ...$pending, ...$reference);
            } else {
                // before the first header only the rubrics count: the title of the day and the contents are not text
                $lead = $parts ? $pending : array_values(array_filter($pending, fn(array $item) => is_italic_line($item['html'])));
                $parts[] = [...$header, 'mark' => $mark, 'rite' => $rite, 'lines' => $lead];
            }

            $mark = null;
            $rite = null;

            $pending = [];
            $headed = true;
        } elseif ($headed) {
            $parts[array_key_last($parts)]['lines'][] = $line;
        } else {
            $pending[] = $line;
        }
    }

    $flush();

    $sections = [];
    // A "Год І" mark covers the sections after it up to the next mark, or up to a section of a type the
    // previous year's block did not have: on weekdays the acclamation and gospel after "Год ІІ" are common.
    $block = null;
    $blockTypes = [];
    $previousBlockTypes = [];
    // the procession's own gospels come before the mass, whose gospel is the one with the "e" slide
    $procession = null;

    foreach ($parts as $part) {
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
        } else {
            $procession = null;
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

    return array_values(array_map(function (array $section): array {
        $texts = alternative_texts($section['lines'], $section['reference']);

        return [
            'type' => $section['type'],
            'title' => $section['title'],
            ...array_shift($texts),
            'alternatives' => $texts,
        ];
    }, $sections));
}

/**
 * A header line: "ПЕРШАЕ ЧЫТАННЕ", "1 РЭСПАНСАРЫЙНЫ ПСАЛЬМ", "ЕВАНГЕЛЛЕ Ў ГОД А", "СПЕЎ ПЕРАД ЕВАНГЕЛЛЕМ Лк 1, 45".
 * What follows the header words is the reference when it reads as one. Other words after them make a header only
 * in a line set in bold, as a part of the title: in plain text "ДРУГОЕ ЧЫТАННЕ не чытаецца" is a rubric.
 *
 * @return ?array{type: string, title: string, year: ?string, reference: string}
 */
function section_header(string $html): ?array {
    $text = plain_text($html);

    foreach (SECTION_HEADERS as $type => $words) {
        if (!preg_match('/^(?:\d+\s+)?('.$words.')(?:\s+Ў\s+ГОД\s+([АВСABC]))?(?:\s+(.*))?$/u', $text, $match)) {
            continue;
        }

        $rest = $match[3] ?? '';
        $isReference = preg_match(BIBLE_REFERENCE, $rest);

        if ($rest !== '' && !$isReference && has_text(preg_replace('#<b>.*?</b>#su', '', $html))) {
            return null;
        }

        return [
            'type' => $type,
            'title' => $isReference || $rest === '' ? $match[1] : "$match[1] $rest",
            'year' => ($match[2] ?? '') === '' ? null : strtr($match[2], YEAR_LETTERS),
            'reference' => $isReference ? $rest : '',
        ];
    }

    return null;
}

/**
 * The texts of a section: the first one, then those after an "або" or "альбо" line, each with its own reference
 * and blocks. The reference is the first right-aligned line, or else a first line that reads as one.
 *
 * @return array{reference: string, blocks: array[]}[]
 */
function alternative_texts(array $lines, string $reference): array {
    $texts = [[]];

    foreach ($lines as $line) {
        if (preg_match(ALTERNATIVE, $line['text'])) {
            $texts[] = [];
        } else {
            $texts[array_key_last($texts)][] = $line;
        }
    }

    // an "або" with nothing after it in the section offers nothing
    $texts = [$texts[0], ...array_filter(array_slice($texts, 1))];

    return array_map(function (array $lines) use (&$reference): array {
        if ($reference === '') {
            $index = array_find_key($lines, fn(array $line) => $line['align'] === 'right');

            if ($index === null && $lines && preg_match(BIBLE_REFERENCE, $lines[0]['text'])) {
                $index = 0;
            }

            if ($index !== null) {
                $reference = $lines[$index]['text'];
                array_splice($lines, $index, 1);

                // the reference shared a paragraph with the line after it
                if (isset($lines[$index])) {
                    $lines[$index]['paragraph'] = true;
                }
            }
        }

        $text = ['reference' => $reference, 'blocks' => section_blocks(line_groups($lines))];
        // the next text finds its own
        $reference = '';

        return $text;
    }, $texts);
}

/**
 * Paragraphs as groups of lines.
 *
 * @return string[][]
 */
function line_groups(array $lines): array {
    $groups = [];

    foreach ($lines as $line) {
        if ($line['paragraph'] || !$groups) {
            $groups[] = [];
        }

        $groups[array_key_last($groups)][] = $line['html'];
    }

    return $groups;
}

/**
 * The text of a section as blocks of lines. A line keeps only bold and italics, as HTML.
 *
 * @param string[][] $groups
 * @return array{kind: string, lines: string[]}[]
 */
function section_blocks(array $groups): array {
    $blocks = [];

    foreach ($groups as $group) {
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
                // The refrain takes the rest of its paragraph: "Або: Аллелюя." A second refrain printed right after
                // the first as "Рэфрэн:" again is the same choice.
                $flush();
                $lines = array_map(
                    fn(string $line) => str_starts_with(plain_text($line), 'Рэфрэн:') ? '<b>Або:</b> '.strip_label($line, 'Рэфрэн:') : $line,
                    array_slice($group, $index + 1),
                );
                $lines = array_filter([strip_label($line, 'Рэфрэн:'), ...$lines]);
                $blocks[] = ['kind' => 'refrain', 'lines' => array_values($lines)];
                break;
            }

            // The opening line is set in bold; one typed plain still opens the text when it comes before the text
            // and is a short sentence: "Чытанне кнігі прарока Эзэхіэля."
            $opening = preg_match('/^(\+\s*)?(Чытанне|Пачатак|Мука)\s/u', $plain) && (
                !has_text(preg_replace('#<b>.*?</b>#su', '', $line))
                || (!$text && !in_array('text', array_column($blocks, 'kind'), true) && mb_strlen($plain) < 150 && str_ends_with($plain, '.'))
            );

            $kind = match (true) {
                str_starts_with($plain, 'Акламацыя:') => 'acclamation',
                $opening => 'intro',
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
 * Throws when a mass parsed into something a reader should not see: a page typed in a way the parser does not
 * know yet. The day is then left out, which shows "no readings" rather than a broken text, and is asked for again.
 */
function check_mass(array $sections, string $url): void {
    $fail = fn(string $problem) => throw new LiturgyException("$url: $problem");
    $runTogether = [];

    if (!array_any($sections, fn(array $section) => $section['type'] === 'gospel')) {
        $fail('no gospel');
    }

    foreach ($sections as $section) {
        foreach ([$section, ...$section['alternatives']] as $text) {
            $where = $section['title'].($text === $section ? '' : ", або {$text['reference']}");
            $kinds = array_column($text['blocks'], 'kind');

            if (!$text['blocks']) {
                $fail("$where: no text");
            }

            if (in_array($section['type'], ['reading', 'gospel', 'procession'], true)) {
                if ($text['reference'] === '') {
                    $fail("$where: no reference");
                }

                if (!in_array('intro', $kinds, true)) {
                    $fail("$where: no opening line");
                }
            }

            foreach ($text['blocks'] as $block) {
                foreach ($block['lines'] as $line) {
                    $plain = plain_text($line);

                    if (section_header($line) !== null || preg_match(ALTERNATIVE, $plain)) {
                        $fail("$where: a header inside the text: $plain");
                    }

                    if (preg_match('/^(Рэфрэн|Акламацыя):/u', $plain)) {
                        $fail("$where: a label inside the text: $plain");
                    }

                    preg_match_all('/\S*\p{Ll}\p{Lu}\S*/u', $plain, $words);
                    array_push($runTogether, ...$words[0]);
                }
            }
        }
    }

    // Words run together all through where the page had spaces only between tags. One or two are a typo on the
    // site ("паводлеЛукі"), which the reader can live with.
    if (count($runTogether) >= 3) {
        $fail('words run together: '.implode(', ', array_slice($runTogether, 0, 3)));
    }
}

// Set in italics, maybe with a bold title in it: "<i>Чытаецца калекта і гімн</i> <b>«Хвала на вышынях Богу…»</b>".
function is_italic_line(string $line): bool {
    $rest = preg_replace('#<i>.*?</i>#su', '', $line);

    return $rest !== $line && !has_text(preg_replace('#<b>.*?</b>#su', '', $rest));
}

// "Рэфрэн:" and "Акламацыя:" are shown by the site itself. The label comes with any emphasis around its word and
// its colon: "<b>Рэфрэн:</b> Слова", "<b>Рэфрэн</b>: Слова", "<b><i>Рэфрэн:</i></b> Слова", "<b>Рэфрэн: Слова</b>".
function strip_label(string $line, string $label): string {
    $tags = '((?:</?(?:b|i|sup|sub)>|\s)*)';
    $line = preg_replace('#^'.$tags.preg_quote(rtrim($label, ':'), '#').$tags.':\s*#u', '$1$2', $line);

    // the emphasis that held only the label
    do {
        $line = preg_replace('#<(b|i|sup|sub)>\s*</\1>#u', '', $line, -1, $count);
    } while ($count);

    return join_runs($line);
}

// libxml reads HTML without a charset declaration as Latin-1, so everything past ASCII goes in as numeric entities.
// Its complaints about HTML5 markup are noise here.
function load_html(string $html): DOMDocument {
    $dom = new DOMDocument('1.0', 'utf-8');
    $useInternalErrors = libxml_use_internal_errors(true);
    $dom->loadHTML(mb_encode_numericentity($html, [0x80, 0x10FFFF, 0, 0x1FFFFF], 'UTF-8'));
    libxml_clear_errors();
    libxml_use_internal_errors($useInternalErrors);

    return $dom;
}

function plain_text(string $html): string {
    return normalize_space(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

function normalize_space(string $text): string {
    return trim(preg_replace('/[\s\x{a0}]+/u', ' ', $text));
}

function last_node(DOMNodeList $nodes): ?DOMNode {
    return $nodes->item($nodes->length - 1);
}

function has_text(string $html): bool {
    return trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'), " \t\r\n\u{a0}") !== '';
}
