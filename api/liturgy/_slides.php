<?php
// Splits a mass from _lectionary.php into presentation slides.

// characters of a reading that fit on one 16:9 slide at fontSize 54
const READING_SLIDE_CHARS = 285;

/**
 * Readings and psalms are numbered in order (r1, p1, r2, ...; the Easter Vigil has eight of each),
 * the acclamation is "es" and the gospel "e". The sequence and the Palm Sunday procession have no slides yet.
 *
 * @param array{type: string, title: string, blocks: array{kind: string, lines: string[]}[]}[] $sections
 * @return array{id: string, title: string, slides: array{fontSize: int, text: string}[]}[]
 */
function liturgy_slides(array $sections): array {
    $result = [];
    $counts = ['reading' => 0, 'psalm' => 0];

    foreach ($sections as $section) {
        [$id, $toSlides] = match ($section['type']) {
            'reading' => ['r'.++$counts['reading'], 'reading_slides'],
            'psalm' => ['p'.++$counts['psalm'], 'psalm_slides'],
            'acclamation' => ['es', 'acclamation_slides'],
            'gospel' => ['e', 'reading_slides'],
            default => [null, null],
        };

        if ($id !== null && !in_array($id, array_column($result, 'id'), true)) {
            $result[] = ['id' => $id, 'title' => $section['title'], 'slides' => $toSlides($section['blocks'])];
        }
    }

    return $result;
}

/**
 * The lines of the given kinds of blocks, still as HTML, with an empty line after each block.
 * The subtitle, the opening line and the rubrics are not read aloud.
 *
 * @return string[]
 */
function block_lines(array $blocks, array $kinds): array {
    $lines = [];

    foreach ($blocks as $block) {
        if (in_array($block['kind'], $kinds, true)) {
            array_push($lines, ...$block['lines'], ...['']);
        }
    }

    return $lines;
}

function slide_text(string $html): string {
    return trim(html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
}

// Prose: whole phrases while they fit on a slide; a phrase too long for a mostly empty slide is split between words.
function reading_slides(array $blocks): array {
    $html = implode(' ', block_lines($blocks, ['text', 'conclusion']));
    // The speaker marks of the Passion (Ев., Е., І., Л.) keep their dot out of the phrase split for now and stick
    // to the next word, so a mark opens its line instead of ending the phrase before it, maybe on the previous slide.
    $html = preg_replace('#<b>\s*(Ев|Е|І|I|Л)\.\s*</b>\s*#u', "$1\x01\u{a0}", $html);
    $text = preg_replace('/[ \t\r\n]+/', ' ', slide_text($html));
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
        $phrase = str_replace("\x01", '.', trim($phrase));
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

function psalm_slides(array $blocks): array {
    $lines = array_map('slide_text', block_lines($blocks, ['refrain', 'text']));

    return verse_slides($lines, fn(string $line) => ltrim(preg_replace('/^\d./u', '', $line), ' .'), 3);
}

function acclamation_slides(array $blocks): array {
    $lines = array_map('slide_text', block_lines($blocks, ['acclamation', 'text']));

    return verse_slides($lines, fn(string $line) => trim(preg_replace('/^\d./u', '', $line), ' .;*'), 4);
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

    // even a short last slide counts: it is the refrain sung after the last stanza
    if (trim($slide) !== '') {
        $slides[] = ['fontSize' => 50, 'text' => rtrim($slide)];
    }

    return $slides;
}
