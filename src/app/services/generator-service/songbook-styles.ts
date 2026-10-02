import type { IStylesOptions } from 'docx';

export type Docx = typeof import('docx');

/**
 * Sizes are in twips (1/20 pt), font sizes in half-points, as Word stores them.
 * The values are those of the 2023 paper songbook.
 */
export const PAGE = {
  width: 8391,
  height: 11907,
  // the inner margin is the left one; mirrored margins move it to the right on even pages
  margin: { top: 284, right: 284, bottom: 567, left: 680, header: 0, footer: 113 },
};
export const BODY_WIDTH = PAGE.width - PAGE.margin.left - PAGE.margin.right;
export const BODY_HEIGHT = PAGE.height - PAGE.margin.top - PAGE.margin.bottom;
export const COLUMN_GAP = 340;
export const COLUMN_WIDTH = (BODY_WIDTH - COLUMN_GAP) / 2;
export const TOC_COLUMN_GAP = 339;
export const TOC_COLUMN_WIDTH = (BODY_WIDTH - TOC_COLUMN_GAP) / 2;

/** Family names as the embedded font files call themselves */
export const FONTS = { text: 'Arsenal', heading: 'Exo 2 SemiBold', chords: 'DejaVu Math TeX Gyre' };

export const TEXT_SIZE = 26;
/**
 * Arsenal's own single line at 13 pt is 1.254 em. Lyrics and chords share it as an exact height,
 * so a chord row stays level with its line and heights can be worked out before Word lays the pages out.
 */
export const LINE = 327;
export const STANZA_AFTER = 60;
/** A song a little too long for a page is set this much tighter, as the 2023 songbook did by hand */
export const COMPACT = { line: 312, after: 20 };
export const BRIDGE_BEFORE = 120;
export const BRIDGE_INDENT = 57;
export const VERSE_INDENT = 284;

/** Exo 2 is 1.2 em high; the border adds its 1 pt gap and its width */
export const HEADING = { size: 28, before: 120, line: 336, border: 30, indent: 680, letterSpacing: -20 };
export const SECTION_TITLE = { size: 32, after: 120, line: 384 };
export const SUBSECTION = { size: 24, before: 40, line: 288, border: 30, letterSpacing: -24 };
export const CHORDS = { size: 26, letterSpacing: -10, cellMargin: 28, fromText: 113 };
export const TOC = { size: 20, line: 320, letterSpacing: -6, indent: 340, pageNumberWidth: 400 };

/** Styles can only hold leaderless tab stops, so the ones with dots and rules go on the paragraphs */
export function tocTabStops(docx: Docx) {
  return [
    { type: docx.TabStopType.RIGHT, position: TOC_COLUMN_WIDTH - TOC.pageNumberWidth, leader: docx.LeaderType.DOT },
    { type: docx.TabStopType.RIGHT, position: TOC_COLUMN_WIDTH, leader: docx.LeaderType.DOT },
  ];
}
/** 17 pt, as the icons of the 2023 songbook */
export const ICON_PX = 23;
export const NOTE_LINE = 470;
/** The rules beside the page number: 2.25 pt thick, level with the middle of the number */
export const FOOTER = { numberWidth: 700, ruleLine: 40, ruleSize: 18 };

export const STYLE = {
  refrain: 'Refrain',
  bridge: 'Bridge',
  chords: 'Chords',
  verse: 'ListParagraph',
  toc1: 'TOC1',
  toc2: 'TOC2',
  tocHeading: 'TOCHeading',
  legend: 'Legend',
  footer: 'Footer',
  title: 'Title',
} as const;

const exact = (docx: Docx, line: number) => ({ line, lineRule: docx.LineRuleType.EXACT });
const single = (docx: Docx) => ({ line: 240, lineRule: docx.LineRuleType.AUTO });
const underline = (docx: Docx) => ({ bottom: { style: docx.BorderStyle.SINGLE, size: 4, space: 1, color: '000000' } });

/** The named styles of the 2023 songbook, under the same names, so the file reads the same in Word */
export function songbookStyles(docx: Docx): IStylesOptions {
  const heading = { font: FONTS.heading, bold: true, color: '000000' };

  return {
    default: {
      document: {
        run: { font: FONTS.text, size: TEXT_SIZE, language: { value: 'be-BY' } },
        paragraph: { spacing: { before: 0, after: STANZA_AFTER, ...exact(docx, LINE) } },
      },
      title: {
        run: { ...heading, size: 48, allCaps: true },
        paragraph: { alignment: docx.AlignmentType.CENTER, spacing: { before: 2400, after: 480, ...single(docx) } },
      },
      heading1: {
        run: { ...heading, size: SECTION_TITLE.size, allCaps: true },
        paragraph: {
          alignment: docx.AlignmentType.CENTER,
          keepNext: true,
          spacing: { before: 0, after: SECTION_TITLE.after, ...single(docx) },
        },
      },
      heading2: {
        run: { ...heading, size: HEADING.size, allCaps: true, characterSpacing: HEADING.letterSpacing },
        paragraph: {
          keepNext: true,
          keepLines: true,
          border: underline(docx),
          spacing: { before: HEADING.before, after: 0, ...single(docx) },
          indent: { left: HEADING.indent, hanging: HEADING.indent },
          // the tag icons sit against the right margin
          rightTabStop: BODY_WIDTH,
        },
      },
      heading3: {
        run: { ...heading, size: SUBSECTION.size, characterSpacing: SUBSECTION.letterSpacing },
        paragraph: {
          keepNext: true,
          border: underline(docx),
          spacing: { before: SUBSECTION.before, after: 0, ...single(docx) },
        },
      },
      listParagraph: {
        run: { font: FONTS.text, size: TEXT_SIZE },
        paragraph: { indent: { left: VERSE_INDENT, hanging: VERSE_INDENT } },
      },
    },
    paragraphStyles: [
      { id: STYLE.refrain, name: 'Рэфрэн', basedOn: 'Normal', quickFormat: true, run: { bold: true } },
      {
        id: STYLE.bridge,
        name: 'Брыдж',
        basedOn: 'Normal',
        quickFormat: true,
        run: { italics: true },
        paragraph: {
          spacing: { before: BRIDGE_BEFORE },
          indent: { left: BRIDGE_INDENT, right: BRIDGE_INDENT },
        },
      },
      {
        id: STYLE.chords,
        name: 'Акорды',
        basedOn: STYLE.refrain,
        quickFormat: true,
        run: { font: FONTS.chords, bold: true, characterSpacing: CHORDS.letterSpacing },
      },
      {
        id: STYLE.toc2,
        name: 'toc 2',
        basedOn: 'Normal',
        next: 'Normal',
        run: { size: TOC.size, allCaps: true, characterSpacing: TOC.letterSpacing },
        paragraph: {
          spacing: { after: 0, ...exact(docx, TOC.line) },
          indent: { left: TOC.indent, hanging: TOC.indent },
        },
      },
      {
        id: STYLE.toc1,
        name: 'toc 1',
        basedOn: STYLE.toc2,
        next: 'Normal',
        run: { bold: true },
        paragraph: { spacing: { before: 120 }, indent: { left: 0, hanging: 0 } },
      },
      {
        id: STYLE.tocHeading,
        name: 'TOC Heading',
        basedOn: 'Heading1',
        next: 'Normal',
        paragraph: { outlineLevel: 9 },
      },
      {
        id: STYLE.legend,
        name: 'Легенда',
        basedOn: 'Normal',
        run: { size: 24 },
        paragraph: { spacing: { after: 40, ...single(docx) } },
      },
      {
        id: STYLE.footer,
        name: 'footer',
        basedOn: 'Normal',
        paragraph: { alignment: docx.AlignmentType.LEFT, spacing: { after: 0, ...single(docx) } },
      },
    ],
  };
}
