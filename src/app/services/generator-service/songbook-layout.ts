/**
 * Word lays the pages out itself, so heights are worked out up front from measured line widths:
 * lyrics and chords have an exact line height, so only line wrapping has to be estimated.
 * The estimate decides which songs flow into two columns and gives the contents its page numbers;
 * whether a song is split is up to "keep with next" in the document, not to the estimate.
 */
import { GADZINKI, GadzinkiBlock } from '../../constants/gadzinki';
import { labelledChords } from '../chord/song-parser';
import { Stanza, StanzaKind, StanzaLine } from '../chord/song-structure';
import { chordLineRuns } from './chord-notation';
import { PrintSong } from './songbook-model';
import {
  BODY_HEIGHT,
  BODY_WIDTH,
  BRIDGE_BEFORE,
  BRIDGE_INDENT,
  CHORDS,
  COLUMN_WIDTH,
  FONTS,
  HEADING,
  ICON_PX,
  COMPACT,
  LINE,
  SECTION_TITLE,
  STANZA_AFTER,
  SUBSECTION,
  TEXT_SIZE,
  TOC,
  TOC_COLUMN_WIDTH,
  VERSE_INDENT,
} from './songbook-styles';

export interface TextStyle {
  font: string;
  /** In half-points */
  size: number;
  bold?: boolean;
  italic?: boolean;
  /** Extra space after every character in twips, negative to condense */
  letterSpacing?: number;
}

/** Text width in twips */
export type MeasureText = (text: string, style: TextStyle) => number;

/** Rough widths for when no canvas is available: an average letter of these fonts is about half an em */
export const approximateMeasure: MeasureText = (text, { size, bold, letterSpacing = 0 }) =>
  text.length * (size * 10 * (bold ? 0.55 : 0.5) + letterSpacing);

export const TEXT_STYLES = {
  heading: { font: FONTS.heading, size: HEADING.size, bold: true, letterSpacing: HEADING.letterSpacing },
  chords: { font: FONTS.chords, size: CHORDS.size, bold: true, letterSpacing: CHORDS.letterSpacing },
  toc: { font: FONTS.text, size: TOC.size, letterSpacing: TOC.letterSpacing },
} satisfies Record<string, TextStyle>;

export const lyricsStyle = (kind: StanzaKind): TextStyle => ({
  font: FONTS.text,
  size: TEXT_SIZE,
  bold: kind === 'chorus',
  italic: kind === 'bridge',
});

// the browser measures Arsenal within about 2% of Word, wider or narrower
const WIDTH_SAFETY = 0.98;
const PAGE_SAFETY = 0.97;
// at 96 dpi a pixel is 15 twips
export const ICON_WIDTH = ICON_PX * 15;
/** The chord column never takes more of the line than this */
const MAX_CHORD_SHARE = 0.45;
// Word sets raised text at about two thirds of its size
const SUPERSCRIPT_SCALE = 0.65;
// word processors draw bold over the regular chord font a little wider than the browser measures it,
// and a chord row that wraps would no longer be level with its line
const CHORD_SLACK = 1.06;
const CHORD_PADDING = 40;
/** Two columns are only worth it when they save this much height */
const COLUMNS_GAIN = 0.85;
/** Lines of a two-column part that may wrap in the narrow column */
const MAX_WRAPPED_SHARE = 0.1;

export const SECTION_TITLE_HEIGHT = SECTION_TITLE.line + SECTION_TITLE.after;

export function lineCount(text: string, width: number, style: TextStyle, measure: MeasureText): number {
  const available = width * WIDTH_SAFETY;
  const space = measure(' ', style);
  let lines = 1;
  let current = 0;

  for (const word of text.split(' ').filter(Boolean)) {
    const wordWidth = measure(word, style);

    if (wordWidth > available) {
      // Word breaks a word wider than the line wherever it runs out of room
      const filled = current ? current + space + wordWidth : wordWidth;
      lines += Math.ceil(filled / available) - 1;
      current = filled % available;
      continue;
    }

    const next = current ? current + space + wordWidth : wordWidth;

    if (next <= available) {
      current = next;
    } else {
      lines++;
      current = wordWidth;
    }
  }

  return lines;
}

export const stanzaIndent = (kind: StanzaKind) => {
  if (kind === 'verse') {
    return VERSE_INDENT;
  }

  return kind === 'bridge' ? 2 * BRIDGE_INDENT : 0;
};

export const stanzaBefore = (kind: StanzaKind) => (kind === 'bridge' ? BRIDGE_BEFORE : 0);

/** The chords of a stanza, one row for each of its lines */
export interface ChordParagraph {
  kind: StanzaKind;
  rows: ChordRow[];
}

/** A chord row as printed: squeezed only when the column would otherwise crowd out the lyrics */
export interface ChordRow {
  chords: string;
  letterSpacing?: number;
  /** A named part without lyrics, "Проігрыш: E F# C# A", printed across the whole line */
  label?: string;
}

/** Chords with a section name and no lyrics under them get a line of their own instead of a place in the column */
export function interlude({ text, chords }: StanzaLine): ChordRow | null {
  const labelled = text ? null : labelledChords(chords);

  return labelled
    ? { label: labelled.label, chords: labelled.chords.replace(/\s*\/+\s*[xх×]\s*(\d+)/giu, ' (x$1)') }
    : null;
}

/** How a lyrics line is squeezed to stay on one line beside the chords */
export interface LineFit {
  /** In half-points */
  size?: number;
  letterSpacing?: number;
}

// tighter letters first, they show the least, then a smaller size down to 12 pt
const LINE_FITS: LineFit[] = [
  { letterSpacing: -6 },
  { letterSpacing: -12 },
  { letterSpacing: -18 },
  ...[25, 24].map((size) => ({ size, letterSpacing: -18 })),
];
// tighter letters, then thin spaces between the chords, then none
const CHORD_FITS = [
  { letterSpacing: -20, spaces: ' ' },
  { letterSpacing: -30, spaces: ' ' },
  { letterSpacing: -30, spaces: '\u2009' },
  { letterSpacing: -30, spaces: '' },
];

export interface SongLayout {
  /** Width of the chord column, 0 without chords */
  chordWidth: number;
  chordParagraphs: ChordParagraph[];
  /** For each line beside the chords, how it is squeezed to stay on one line */
  lineFits: (LineFit | undefined)[][];
  /** Stanzas printed beside the chords; the ones after them run the full width */
  covered: number;
  /** The first stanza of the part that flows in two columns */
  columnsFrom?: number;
  /** The lyrics beside the chords fit on a page, so the table row is not split */
  cantSplit: boolean;
  /** Set with a tighter line height and gap between stanzas to fit on a page */
  compact: boolean;
  /** The song fits on a page, so every part of it keeps with the next one */
  keepTogether: boolean;
  /** Keeping with the next paragraph does not carry over into a section with columns */
  pageBreakBefore: boolean;
  height: number;
  /** Estimated page of the heading */
  page: number;
}

interface SongGeometry {
  headingHeight: number;
  chordWidth: number;
  chordParagraphs: ChordParagraph[];
  lineFits: (LineFit | undefined)[][];
  covered: number;
  /** Every line beside the chords has a row of its own, so the table is as tall as its stanzas */
  tableHeight: number;
  /** Word breaks a table that does not fit between stanzas, like the stanzas after it */
  tableHeights: number[];
  /** Stanzas after the chords, at full width */
  restHeights: number[];
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Width of a chord row as printed, with the raised chord types smaller */
const chordRowWidth = (row: string, style: TextStyle, measure: MeasureText) =>
  sum(
    chordLineRuns(row).map(({ text, superscript }) =>
      measure(text, superscript ? { ...style, size: style.size * SUPERSCRIPT_SCALE } : style),
    ),
  );

const lastIndexWhere = <T>(items: T[], test: (item: T) => boolean) => {
  for (let index = items.length - 1; index >= 0; index--) {
    if (test(items[index])) {
      return index;
    }
  }

  return -1;
};

export const lastChordStanza = (stanzas: Stanza[]) =>
  lastIndexWhere(stanzas, (stanza) => stanza.lines.some(({ chords }) => chords));

export function headingHeight(song: Pick<PrintSong, 'number' | 'title' | 'tagIds'>, measure: MeasureText): number {
  const text = song.number ? `${song.number}. ${song.title}` : song.title;
  const icons = song.tagIds.length ? song.tagIds.length * ICON_WIDTH + 200 : 0;
  // the heading style prints in capitals
  const lines = lineCount(text.toUpperCase(), BODY_WIDTH - HEADING.indent - icons, TEXT_STYLES.heading, measure);

  return HEADING.before + lines * HEADING.line + HEADING.border;
}

function chordParagraphs(stanzas: Stanza[], fitRow: (chords: string) => ChordRow): ChordParagraph[] {
  return stanzas.map((stanza) => ({
    kind: stanza.kind,
    rows: stanza.lines.map((line) => interlude(line) ?? (line.chords ? fitRow(line.chords) : { chords: '' })),
  }));
}

export interface Spacing {
  line: number;
  after: number;
}

const NORMAL: Spacing = { line: LINE, after: STANZA_AFTER };

const paragraphHeight = (kind: StanzaKind, rows: number, spacing: Spacing = NORMAL) =>
  stanzaBefore(kind) + Math.max(1, rows) * spacing.line + spacing.after;

const chordWidthOf = (row: ChordRow, measure: MeasureText) =>
  chordRowWidth(
    row.chords,
    { ...TEXT_STYLES.chords, letterSpacing: row.letterSpacing ?? CHORDS.letterSpacing },
    measure,
  ) * CHORD_SLACK;

// the spaces kept a chord over its syllable on the site; in a column of its own one space between chords is enough
const chordVariants = (row: string): ChordRow[] => {
  const chords = row.replace(/\s+/g, ' ').trim();

  return [
    { chords },
    ...CHORD_FITS.map(({ letterSpacing, spaces }) => ({ chords: chords.replace(/ /g, spaces), letterSpacing })),
  ];
};

/** The first way of writing the row that fits, or the tightest one */
function fitChordRow(chords: string, width: number, measure: MeasureText): ChordRow {
  const variants = chordVariants(chords);
  return variants.find((row) => chordWidthOf(row, measure) <= width) ?? variants[variants.length - 1];
}

/** A line squeezed just enough to stay on one line, or left as it is to wrap when nothing helps */
function fitLine(
  text: string,
  width: number,
  kind: StanzaKind,
  measure: MeasureText,
): { lines: number; fit?: LineFit } {
  const style = lyricsStyle(kind);

  if (lineCount(text, width, style, measure) === 1) {
    return { lines: 1 };
  }

  const fit = LINE_FITS.find((candidate) => lineCount(text, width, { ...style, ...candidate }, measure) === 1);
  return fit ? { fit, lines: 1 } : { lines: lineCount(text, width, style, measure) };
}

/**
 * The stanzas up to the last one with chords sit in a table beside the chords,
 * so lyrics and chords share a row and never end up on different pages; the rest run the full width.
 * The chord column takes its natural width when the lyrics fit beside it; otherwise its widest rows are squeezed
 * to make room, and lines still too long are squeezed in turn.
 */
function songGeometry(song: PrintSong, measure: MeasureText, spacing: Spacing = NORMAL): SongGeometry {
  const covered = lastChordStanza(song.stanzas) + 1;
  const beside = song.stanzas.slice(0, covered);
  const rows = beside
    .flatMap((stanza) => stanza.lines.filter((line) => line.chords && !interlude(line)))
    .map(({ chords }) => chords);
  const padding = CHORDS.cellMargin + CHORD_PADDING;
  const widestOf = (variant: number) =>
    Math.max(0, ...rows.map((row) => chordWidthOf(chordVariants(row)[variant], measure)));
  const natural = widestOf(0);
  const tightest = widestOf(CHORD_FITS.length);
  // a line without chords runs over the chord column, so only lines with chords decide how wide it can be
  const lines = beside
    .flatMap((stanza) => stanza.lines.map(({ text, chords }) => ({ text, chords, kind: stanza.kind })))
    .filter(({ text, chords }) => text && chords);
  const widthAt = (text: string, kind: StanzaKind, fit: LineFit = {}) =>
    measure(text, { ...lyricsStyle(kind), ...fit }) / WIDTH_SAFETY + stanzaIndent(kind);
  // lines that wrap whatever happens do not get to squeeze the chords
  const widest = Math.max(
    0,
    ...lines
      .filter(
        ({ text, kind }) =>
          widthAt(text, kind, LINE_FITS[LINE_FITS.length - 1]) <= BODY_WIDTH - CHORDS.fromText - tightest - padding,
      )
      .map(({ text, kind }) => widthAt(text, kind)),
  );
  const room = BODY_WIDTH - CHORDS.fromText - padding - widest;
  const inner = Math.min(BODY_WIDTH * MAX_CHORD_SHARE, natural <= room ? natural : Math.max(tightest, room));
  const chordWidth = covered ? Math.round(inner + padding) : 0;

  const besideFits = beside.map((stanza) =>
    stanza.lines.map(({ text, chords }) => {
      if (!text) {
        return { lines: 0 };
      }

      const width = chords ? BODY_WIDTH - chordWidth - CHORDS.fromText : BODY_WIDTH;
      return fitLine(text, width - stanzaIndent(stanza.kind), stanza.kind, measure);
    }),
  );
  const besideCounts = besideFits.map((fits) => fits.map(({ lines: count }) => count));
  const paragraphs = chordParagraphs(beside, (chords) => fitChordRow(chords, inner, measure));
  // a row is at least one line high, also when it only holds chords
  const tableHeights = beside.map((stanza, index) =>
    paragraphHeight(stanza.kind, sum(besideCounts[index].map((count) => Math.max(1, count))), spacing),
  );
  const fullCounts = (stanza: Stanza) =>
    stanza.lines.map(({ text }) =>
      text ? lineCount(text, BODY_WIDTH - stanzaIndent(stanza.kind), lyricsStyle(stanza.kind), measure) : 0,
    );

  return {
    headingHeight: headingHeight(song, measure),
    chordWidth,
    chordParagraphs: paragraphs,
    lineFits: besideFits.map((fits) => fits.map((line) => ('fit' in line ? line.fit : undefined))),
    covered,
    tableHeight: sum(tableHeights),
    tableHeights,
    restHeights: song.stanzas
      .slice(covered)
      .map((stanza) => paragraphHeight(stanza.kind, sum(fullCounts(stanza)), spacing)),
  };
}

/** Word balances the columns at the end of the section; stanzas are kept whole */
function balancedHeight(heights: number[]): number {
  let best = sum(heights);

  for (let split = 1; split < heights.length; split++) {
    best = Math.min(best, Math.max(sum(heights.slice(0, split)), sum(heights.slice(split))));
  }

  return best;
}

function columnsPart(stanzas: Stanza[], measure: MeasureText) {
  let lines = 0;
  let wrapped = 0;

  const heights = stanzas.map((stanza) => {
    const counts = stanza.lines
      .filter(({ text }) => text)
      .map(({ text }) => lineCount(text, COLUMN_WIDTH - stanzaIndent(stanza.kind), lyricsStyle(stanza.kind), measure));

    lines += counts.length;
    wrapped += counts.filter((count) => count > 1).length;
    return paragraphHeight(stanza.kind, sum(counts));
  });

  return { height: balancedHeight(heights), wrappedShare: lines ? wrapped / lines : 0 };
}

/**
 * The verses after the chords may flow into two columns,
 * as the 2023 songbook does with songs too long for a page.
 */
export function layoutSong(song: PrintSong, measure: MeasureText): Omit<SongLayout, 'page' | 'pageBreakBefore'> {
  const geometry = songGeometry(song, measure);
  const oneColumn = geometry.headingHeight + geometry.tableHeight + sum(geometry.restHeights);
  const rest = song.stanzas.slice(geometry.covered);
  const compact = songGeometry(song, measure, COMPACT);
  const compactHeight = compact.headingHeight + compact.tableHeight + sum(compact.restHeights);
  const base = {
    compact: false,
    chordWidth: geometry.chordWidth,
    chordParagraphs: geometry.chordParagraphs,
    lineFits: geometry.lineFits,
    covered: geometry.covered,
    cantSplit: geometry.covered > 0 && geometry.tableHeight <= BODY_HEIGHT * PAGE_SAFETY,
  };

  // a song just over a page fits on one set a little tighter, rather than splitting or going into columns
  if (oneColumn > BODY_HEIGHT && compactHeight <= BODY_HEIGHT * PAGE_SAFETY) {
    return {
      ...base,
      chordParagraphs: compact.chordParagraphs,
      lineFits: compact.lineFits,
      cantSplit: compact.covered > 0,
      compact: true,
      keepTogether: true,
      height: compactHeight,
    };
  }

  if (rest.length >= 2) {
    const columns = columnsPart(rest, measure);
    const twoColumns = geometry.headingHeight + geometry.tableHeight + columns.height;
    const worthIt =
      oneColumn > BODY_HEIGHT * PAGE_SAFETY
      && twoColumns < oneColumn * COLUMNS_GAIN
      && columns.wrappedShare <= MAX_WRAPPED_SHARE;

    if (worthIt) {
      return { ...base, columnsFrom: geometry.covered, keepTogether: twoColumns <= BODY_HEIGHT, height: twoColumns };
    }
  }

  return { ...base, keepTogether: oneColumn <= BODY_HEIGHT, height: oneColumn };
}

function gadzinkiBlockHeight(block: GadzinkiBlock, measure: MeasureText): number {
  const textStyle = lyricsStyle('plain');
  const height = (text: string, indent: number) =>
    sum(text.split('\n').map((line) => lineCount(line, BODY_WIDTH - indent, textStyle, measure))) * LINE + STANZA_AFTER;

  switch (block.kind) {
    case 'list':
      return sum(block.items.map((item) => height(item, VERSE_INDENT)));
    case 'subtitle':
      return LINE + STANZA_AFTER;
    case 'lines':
      return (
        BRIDGE_BEFORE
        + height(block.lines.map((line) => line.map(({ text }) => text).join('')).join('\n'), 2 * BRIDGE_INDENT)
      );
  }
}

export function gadzinkiHeight(measure: MeasureText): number {
  return sum(
    GADZINKI.map(
      (section) =>
        SUBSECTION.before
        + SUBSECTION.line
        + SUBSECTION.border
        + sum(section.blocks.map((block) => gadzinkiBlockHeight(block, measure))),
    ),
  );
}

export interface PlanSection {
  title: string;
  songs?: PrintSong[];
  /** Height of a section that is not songs */
  height?: number;
}

export interface SongbookPlan {
  tocPages: number;
  /** Estimated first page of each section */
  sectionPages: number[];
  songs: SongLayout[][];
  pages: number;
}

export function tocEntryText(song: Pick<PrintSong, 'number' | 'title'>): string {
  return song.number ? `${song.number}. ${song.title}` : song.title;
}

function tocHeight(sections: PlanSection[], measure: MeasureText): number {
  return sum(
    sections.map(
      ({ songs = [] }) =>
        120
        + TOC.line
        + sum(
          songs.map((song) => {
            const icons = song.tagIds.length * ICON_WIDTH;
            const width = TOC_COLUMN_WIDTH - TOC.indent - TOC.pageNumberWidth - icons;
            return lineCount(tocEntryText(song).toUpperCase(), width, TEXT_STYLES.toc, measure) * TOC.line;
          }),
        ),
    ),
  );
}

/**
 * Follows the songs page by page the way Word will place them: a song that fits on a page
 * but not in what is left of the current one moves to the next page as a whole,
 * a longer song starts where its heading and first stanza fit and breaks between stanzas.
 */
export function planSongbook(
  sections: PlanSection[],
  options: { toc: boolean },
  measure: MeasureText = approximateMeasure,
): SongbookPlan {
  let page = 0;
  let used = 0;
  const newPage = () => {
    page++;
    used = 0;
  };

  let tocPages = 0;

  if (options.toc) {
    const firstPage = 2 * (BODY_HEIGHT - SECTION_TITLE_HEIGHT);
    tocPages = 1 + Math.max(0, Math.ceil((tocHeight(sections, measure) - firstPage) / (2 * BODY_HEIGHT)));
    page += tocPages;
  }

  const sectionPages: number[] = [];

  const songs = sections.map((section) => {
    newPage();
    used = SECTION_TITLE_HEIGHT;
    sectionPages.push(page);

    if (section.height !== undefined) {
      const total = used + section.height;
      page += Math.max(0, Math.ceil(total / BODY_HEIGHT) - 1);
      used = total % BODY_HEIGHT;
    }

    return (section.songs ?? []).map((song) => {
      const layout = layoutSong(song, measure);
      let pageBreakBefore = false;

      if (layout.keepTogether) {
        if (used > 0 && used + layout.height > BODY_HEIGHT) {
          pageBreakBefore = layout.columnsFrom !== undefined;
          newPage();
        }

        const songPage = page;
        used += layout.height;
        return { ...layout, pageBreakBefore, page: songPage };
      }

      const geometry = songGeometry(song, measure);
      const parts = [...geometry.tableHeights, ...geometry.restHeights];

      if (used > 0 && used + geometry.headingHeight + Math.min(parts[0] ?? 0, BODY_HEIGHT) > BODY_HEIGHT) {
        newPage();
      }

      const songPage = page;
      used += geometry.headingHeight;

      for (const height of parts) {
        if (used + height > BODY_HEIGHT) {
          newPage();
        }

        // a stanza taller than a page goes on over the next ones
        page += Math.floor((used + height) / BODY_HEIGHT);
        used = (used + height) % BODY_HEIGHT;
      }

      return { ...layout, pageBreakBefore, page: songPage };
    });
  });

  return { tocPages, sectionPages, songs, pages: page };
}
