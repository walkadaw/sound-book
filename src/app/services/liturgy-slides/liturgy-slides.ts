import { LiturgyBlock, LiturgyBlockKind, LiturgySection } from '../../interfaces/liturgy';
import { Slide, SlideList } from '../../interfaces/slide';

const PROSE_FONT_SIZE = 54;
const VERSE_FONT_SIZE = 50;

// How much text fits on a slide; SlidesService measures it in the DOM.
export interface SlideMeasure {
  lines(text: string, fontSize: number): number;
  maxLines(fontSize: number): number;
}

interface VerseRule {
  kinds: LiturgyBlockKind[];
  clean: (line: string) => string;
  // a slide ends after the stanza that takes it past this many lines, blank ones included
  maxLines: number;
}

// Verse numbers ("1.") open the psalm stanzas; the acclamation also ends its lines with "." and "*".
const PSALM: VerseRule = {
  kinds: ['refrain', 'text'],
  clean: (line) => line.replace(/^\d./u, '').replace(/^[ .]+/u, ''),
  maxLines: 3,
};
const ACCLAMATION: VerseRule = {
  kinds: ['acclamation', 'text'],
  clean: (line) => line.replace(/^\d./u, '').replace(/^[ .;*]+|[ .;*]+$/gu, ''),
  maxLines: 4,
};
const SEQUENCE: VerseRule = { ...PSALM, kinds: ['text'] };

// The speaker marks of the Passion open a line, so their dot must not end the phrase before them.
const SPEAKER_MARK = /<b>\s*(Ев|Е|І|I|Л)\.\s*<\/b>\s*/gu;
const MARK_DOT = '\u0001';

/**
 * The slides of one mass, a list per section in the order of the liturgy. Only the texts read aloud go on them,
 * and a section with nothing to read aloud gets no list.
 */
export function liturgySlides(liturgy: string, sections: LiturgySection[], measure: SlideMeasure): SlideList[] {
  const lists = sections.map(({ type, title, blocks }, index): SlideList => {
    let slides: Slide[];

    switch (type) {
      case 'psalm':
        slides = verseSlides(blocks, PSALM, measure);
        break;
      case 'acclamation':
        slides = verseSlides(blocks, ACCLAMATION, measure);
        break;
      case 'sequence':
        slides = verseSlides(blocks, SEQUENCE, measure);
        break;
      default:
        slides = proseSlides(blocks, measure);
    }

    return { id: `${liturgy}-${index}`, title, slides, liturgy };
  });

  return lists.filter(({ slides }) => slides.length);
}

function textOf(html: string): string {
  return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').trim();
}

// Whole phrases while they fit; a phrase too long for a mostly empty slide is split between words.
function proseSlides(blocks: LiturgyBlock[], measure: SlideMeasure): Slide[] {
  const html = blocks
    .filter(({ kind }) => kind === 'text' || kind === 'conclusion')
    .flatMap(({ lines }) => lines)
    .join(' ')
    .replace(SPEAKER_MARK, `$1${MARK_DOT}\u00a0`);
  const text = textOf(html).replace(/[ \t\r\n]+/g, ' ');
  // A phrase ends at a mark (and the quote or bracket it closes) before a space, so "што-небудзь" stays whole.
  const phrases = (text.match(/.*?[.?!:,-][»”")\]]*(?=\s|$)|.+/gu) ?? [])
    .map((phrase) => phrase.trim().replaceAll(MARK_DOT, '.'))
    .filter(Boolean);

  const maxLines = measure.maxLines(PROSE_FONT_SIZE);
  const slides: Slide[] = [];
  let slide = '';
  // kept so that a slide is measured once per change
  let slideLines = 0;

  const close = () => {
    slides.push({ fontSize: PROSE_FONT_SIZE, text: slide });
    slide = '';
    slideLines = 0;
  };
  // puts the text on the slide if it fits there
  const add = (next: string): boolean => {
    const joined = slide ? `${slide} ${next}` : next;
    const lines = measure.lines(joined, PROSE_FONT_SIZE);

    if (lines > maxLines) {
      return false;
    }

    slide = joined;
    slideLines = lines;

    return true;
  };

  for (const phrase of phrases) {
    if (add(phrase)) {
      continue;
    }

    if (slide && slideLines * 2 > maxLines) {
      close();

      if (add(phrase)) {
        continue;
      }
    }

    for (const word of phrase.split(' ')) {
      if (!add(word) && slide) {
        close();
        add(word);
      }

      // a word too long for a whole slide still gets one
      if (!slide) {
        slide = word;
        slideLines = maxLines;
      }
    }
  }

  if (slide) {
    close();
  }

  return slides;
}

// A blank line ends a stanza, and a stanza that takes the slide past rule.maxLines ends the slide too.
function verseSlides(blocks: LiturgyBlock[], rule: VerseRule, measure: SlideMeasure): Slide[] {
  const stanzas: string[][] = [];
  let stanza: string[] = [];

  for (const block of blocks.filter(({ kind }) => rule.kinds.includes(kind))) {
    for (const line of [...block.lines.map((html) => rule.clean(textOf(html))), '']) {
      if (line) {
        stanza.push(line);
      } else if (stanza.length) {
        stanzas.push(stanza);
        stanza = [];
      }
    }
  }

  const maxLines = measure.maxLines(VERSE_FONT_SIZE);
  const fits = (text: string) => measure.lines(text, VERSE_FONT_SIZE) <= maxLines;
  const render = (slide: string[][]) => slide.map((lines) => lines.join('\n')).join('\n\n');
  const slides: Slide[] = [];
  let slide: string[][] = [];

  const close = () => {
    slides.push({ fontSize: VERSE_FONT_SIZE, text: render(slide) });
    slide = [];
  };

  for (const next of stanzas) {
    if (slide.length && !fits(render([...slide, next]))) {
      close();
    }

    if (fits(render([next]))) {
      slide.push(next);
    } else {
      // a stanza longer than a slide is split between lines
      for (const line of next) {
        const lines = [...(slide[0] ?? []), line];

        if (slide.length && !fits(render([lines]))) {
          close();
          slide = [[line]];
        } else {
          slide = [lines];
        }
      }
    }

    if (slide.flat().length + slide.length - 1 > rule.maxLines) {
      close();
    }
  }

  // even a short last slide counts: it is the refrain sung after the last stanza
  if (slide.length) {
    close();
  }

  return slides;
}
