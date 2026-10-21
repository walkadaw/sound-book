<?php
// Splits today's liturgy into presentation slides: the article (HTML from _parser.php) holds the texts,
// the short reading list (`artlitreadings`) tells which of them are read today and in what order.

// characters of a reading that fit on one 16:9 slide at fontSize 54
const READING_SLIDE_CHARS = 285;

const READING_HEADERS = [
    'ПЕРШАЕ ЧЫТАННЕ', 'ДРУГОЕ ЧЫТАННЕ', 'ТРЭЦЯЕ ЧЫТАННЕ', 'ЧАЦВЁРТАЕ ЧЫТАННЕ',
    'ПЯТАЕ ЧЫТАННЕ', 'ШОСТАЕ ЧЫТАННЕ', 'СЁМАЕ ЧЫТАННЕ', 'ЭПІСТАЛА',
];

// left out when a reference from the reading list is looked up in a text's header
const REFERENCE_IGNORED = [',', '(', ')', '.', '-', '–', '—', ' ', "\u{a0}", ';', ':', '?'];

/** @return array{reading: string[], psalm: string[], acclamation: string[], gospel: string[]} */
function liturgy_sections(string $article): array {
    $find = function (string $pattern) use ($article): array {
        preg_match_all("#{$pattern}#is", $article, $matches);

        return $matches[1];
    };

    return [
        'reading' => array_merge(...array_map(fn(string $header) => $find($header.'(.+?)<span class="divider">'), READING_HEADERS)),
        'psalm' => $find('РЭСПАНСАРЫЙНЫ ПСАЛЬМ(.+?)(<span class="divider">|СПЕЎ ПЕРАД)'),
        'acclamation' => $find('СПЕЎ ПЕРАД ЕВАНГЕЛЛЕМ(.+?)(<span class="divider">|ЕВАНГЕЛЛЕ)'),
        'gospel' => $find('<b>ЕВАНГЕЛЛЕ(.+?)(Пераклад здзейснены|<div align="center">|<span class="divider">)'),
    ];
}

/**
 * The references of the reading list in order: first reading, psalm, [second reading, ...] gospel.
 * Each is a list of alternatives, which the list separates with "альбо".
 *
 * @return string[][]
 */
function parse_readings(string $readings): array {
    $text = preg_match('#На Імшу(.+?)$#ius', $readings, $match) ? $match[1] : $readings;
    $text = trim(str_replace(['1 чыт.', '2 чыт.', '3 чыт.', 'чыт.', '(карац.)', 'Ев.', 'вечаровая Імша', ';', '\\', '/', ':'], '', $text));
    $text = str_replace("\u{a0}", ' ', $text);

    $isWord = fn(string $value): bool => (bool)preg_match('/^[а-яёіў.]+$/iu', $value);

    $groups = [];
    $group = 0;
    $current = null;

    foreach (explode(' ', $text) as $word) {
        if ($word === 'альбо') {
            $count = count($groups);

            if ($count <= 4) {
                if ($count < 3 || $current !== null) {
                    $groups[$group][] = trim((string)$current, '.');
                }

                $current = null;
                $group = match ($count) {
                    0, 1 => 0,
                    2 => 2,
                    default => 3,
                };
            }

            continue;
        }

        if (mb_strlen($current ?? '') === 1 || ($isWord($current ?? '') && $isWord($word))) {
            $current .= " $word";
            continue;
        }

        if (mb_strlen($word) === 1) {
            $current = ($current ?? '') === '' ? $word : "$current $word";
            continue;
        }

        // a book name starts the next reference
        if ($word === '' || $isWord($word)) {
            if (($current ?? '') !== '') {
                $groups[$group][] = trim($current, '.');
                $group++;

                if ($word === '') {
                    $current = null;
                    continue;
                }
            }

            $current = $word;
        } else {
            $current .= " $word";
        }
    }

    $groups[$group][] = trim((string)$current, '.');

    return $groups;
}

/** @return array{id: string, title: string, slides: array{fontSize: int, text: string}[]}[] */
function liturgy_slides(array $sections, array $readings): array {
    $result = [];
    $add = function (string $id, string $title, string $section, int $reading, callable $toSlides) use (&$result, $sections, $readings): void {
        $key = find_section($sections[$section], $readings[$reading] ?? []);

        if ($key !== null) {
            $result[] = ['id' => $id, 'title' => $title, 'slides' => $toSlides($sections[$section][$key])];
        }
    };

    $count = count($readings);

    $add('r1', 'ПЕРШАЕ ЧЫТАННЕ', 'reading', 0, 'reading_slides');
    $add('p1', 'РЭСПАНСАРЫЙНЫ ПСАЛЬМ', 'psalm', 1, 'psalm_slides');

    if ($count > 3) {
        $add('r2', 'ДРУГОЕ ЧЫТАННЕ', 'reading', 2, 'reading_slides');
    }

    if ($count > 5) {
        $add('p2', 'РЭСПАНСАРЫЙНЫ ПСАЛЬМ', 'psalm', 3, 'psalm_slides');
        $add('r3', 'ТРЭЦЯЕ ЧЫТАННЕ', 'reading', 4, 'reading_slides');
        $add('p3', 'РЭСПАНСАРЫЙНЫ ПСАЛЬМ', 'psalm', 5, 'psalm_slides');
        $add('e', 'ЕВАНГЕЛЛЕ', 'gospel', 6, 'reading_slides');
    } elseif ($count === 3 || $count === 4) {
        // the acclamation has no reference of its own and goes with the gospel of the same number
        $key = find_section($sections['gospel'], $readings[$count - 1]);

        if ($key !== null) {
            $result[] = ['id' => 'es', 'title' => 'СПЕЎ ПЕРАД ЕВАНГЕЛЛЕ', 'slides' => acclamation_slides($sections['acclamation'][$key] ?? '')];
            $result[] = ['id' => 'e', 'title' => 'ЕВАНГЕЛЛЕ', 'slides' => reading_slides($sections['gospel'][$key])];
        }
    }

    return $result;
}

// The text whose header (the first div) contains one of the references.
function find_section(array $texts, array $references): ?int {
    $references = array_filter(array_map(fn($reference) => normalize_reference((string)$reference), $references), 'strlen');

    foreach ($texts as $key => $html) {
        $header = preg_match('#<div.*?>(.*?)<*\/*div#is', $html, $match) ? $match[1] : '';
        $header = normalize_reference(html_entity_decode(strip_tags($header), ENT_QUOTES, 'UTF-8'));

        foreach ($references as $reference) {
            if (str_contains($header, $reference)) {
                return $key;
            }
        }
    }

    return null;
}

// Book names in the references are sometimes typed with Latin letters that look like Cyrillic ones.
function normalize_reference(string $reference): string {
    return str_replace(
        ['a', 'b', 'c', 'y', 'k', 'p', 'i', 'e', 'm'],
        ['а', 'в', 'с', 'у', 'к', 'р', 'і', 'е', 'м'],
        mb_strtolower(str_replace(REFERENCE_IGNORED, '', $reference)),
    );
}

// Prose: whole phrases while they fit on a slide; a phrase too long for a mostly empty slide is split between words.
function reading_slides(string $html): array {
    $text = preg_replace('|^.*?Чытанне.*?</p>|i', '', str_replace(["\r", "\n"], '', $html));
    $text = trim(html_entity_decode(strip_tags($text), ENT_QUOTES, 'UTF-8'));
    $phrases = preg_split('~(.*?[.?!:,-])~', $text, -1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_DELIM_CAPTURE);

    $slides = [];
    $slide = '';
    $length = 0;

    $close = function () use (&$slides, &$slide, &$length): void {
        $slides[] = ['fontSize' => 54, 'text' => trim($slide)];
        $slide = '';
        $length = 0;
    };

    foreach ($phrases as $phrase) {
        $phrase = trim($phrase);
        $phraseLength = mb_strlen($phrase);

        if ($length + $phraseLength <= READING_SLIDE_CHARS) {
            $slide .= "$phrase ";
            $length += $phraseLength;
        } elseif ($length > intdiv(READING_SLIDE_CHARS, 2)) {
            $close();
            $slide = "$phrase ";
            $length = $phraseLength;
        } else {
            foreach (explode(' ', $phrase) as $word) {
                $wordLength = mb_strlen($word) + 1;

                if ($length + $wordLength >= READING_SLIDE_CHARS) {
                    $close();
                }

                $slide .= "$word ";
                $length += $wordLength;
            }
        }
    }

    if ($slide !== '') {
        $slides[] = ['fontSize' => 54, 'text' => $slide];
    }

    return $slides;
}

function psalm_slides(string $html): array {
    // The refrain is printed in full once; every "Рэфрэн:" gets its words.
    if (preg_match('#Рэфрэн:(.+?)(<br>|</p>)#is', $html, $refrain)) {
        $html = str_replace($refrain[0], 'Рэфрэн:</b><br></p>', $html);
        $html = str_replace('Рэфрэн:', strip_tags($refrain[0]), $html);
    }

    $html = str_replace('Рэфрэн:', '', $html);
    $html = preg_replace('|(?s)<div.*?</div>|', '', $html);
    $text = html_entity_decode(strip_tags(str_replace(['</p>', '<br>'], '|', $html)), ENT_QUOTES, 'UTF-8');

    return verse_slides(explode('|', str_replace('|||', '||', $text)), fn(string $line) => ltrim(preg_replace('/^\d./u', '', $line), ' .'), 3);
}

function acclamation_slides(string $html): array {
    $html = str_replace('Акламацыя:', '', $html);
    // the right-aligned Bible reference
    $html = preg_replace('|<div\s.*?right.*?>(.*?)</div>|', '<br>', $html);
    $text = html_entity_decode(strip_tags(str_replace(['</p>', '<br>'], '|', $html)), ENT_QUOTES, 'UTF-8');

    return verse_slides(explode('|', $text), fn(string $line) => trim(preg_replace('/^\d./u', '', $line), ' .;*'), 4);
}

// Verse: a blank line ends a stanza, and the slide too once it has more than $maxLines lines.
function verse_slides(array $lines, callable $clean, int $maxLines): array {
    $slides = [];
    $slide = '';
    $count = 0;
    $afterText = false;

    foreach ($lines as $line) {
        $line = trim($line);

        if ($count === 0 && $line === '') {
            continue;
        }

        $line = $clean($line);

        if ($line === '' && $count > 0) {
            if ($count > $maxLines) {
                $slides[] = ['fontSize' => 50, 'text' => $slide];
                $slide = '';
                $count = 0;
            } else {
                $slide .= "\n\n";
            }

            $afterText = false;
        } else {
            if ($afterText) {
                $slide .= "\n";
            }

            $slide .= $line;
            $afterText = true;
        }

        $count++;
    }

    if ($slide !== '' && $count > 3) {
        $slides[] = ['fontSize' => 50, 'text' => $slide];
    }

    return $slides;
}
