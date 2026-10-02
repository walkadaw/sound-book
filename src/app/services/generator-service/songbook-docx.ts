import type {
  Document,
  FileChild,
  Footer,
  ISpacingProperties,
  Paragraph,
  ParagraphChild,
  Table,
  TextRun,
} from 'docx';
import { GADZINKI, GADZINKI_TITLE, GadzinkiBlock } from '../../constants/gadzinki';
import { TAGS_LIST } from '../../constants/tag-list';
import { Song } from '../../interfaces/song';
import { Stanza, StanzaKind } from '../chord/song-structure';
import { chordLineRuns } from './chord-notation';
import {
  ChordRow,
  MeasureText,
  PlanSection,
  SongLayout,
  SongbookPlan,
  approximateMeasure,
  gadzinkiHeight,
  planSongbook,
  stanzaBefore,
  tocEntryText,
} from './songbook-layout';
import { PrintOptions, PrintSong, printSong } from './songbook-model';
import {
  BODY_HEIGHT,
  BODY_WIDTH,
  CHORDS,
  COLUMN_GAP,
  COMPACT,
  Docx,
  FONTS,
  FOOTER,
  ICON_PX,
  LINE,
  NOTE_LINE,
  PAGE,
  SECTION_TITLE,
  STANZA_AFTER,
  STYLE,
  TOC_COLUMN_GAP,
  VERSE_INDENT,
  songbookStyles,
  tocTabStops,
  verseNumbering,
  verseNumberingReference,
} from './songbook-styles';

export interface PaperOptions extends PrintOptions {
  addPartsOfMass: boolean;
  addGadzinki: boolean;
  toc: boolean;
  /** Pages of lines for notes at the end, 0 for none */
  notesPages: number;
}

export interface SongbookContent {
  songs: Song[];
  partsOfMass: Song[];
  options: PaperOptions;
  /** Text width as Word will lay it out; a rough estimate is used without it */
  measure?: MeasureText;
  /** PNG icon for each tag id */
  tagIcons?: ReadonlyMap<number, Uint8Array>;
}

export interface Songbook {
  document: Document;
  plan: SongbookPlan;
  /** The songs as printed, with what their text gave away about mistakes */
  songs: PrintSong[];
}

interface DocumentSection {
  columns: 1 | 2;
  gap?: number;
  pageNumbers?: boolean;
  children: FileChild[];
}

export const SECTION_TITLES = {
  songs: 'Спевы',
  partsOfMass: 'Часткі Імшы',
  notes: 'Нататкі',
  toc: 'Змест',
};

const TOC_ICON_PX = 18;

export const songBookmark = (song: Pick<PrintSong, 'id'>) => `song${song.id}`;
const sectionBookmark = (index: number) => `section${index}`;

/** The list number of a verse: every numbered stanza is a list of its own, or Word would count on from the last one */
type NumberVerse = (number: string) => { reference: string; level: number; instance: number };

/**
 * The songbook as a Word document: what goes where comes from the plan of the pages,
 * how it looks comes from the named styles of the 2023 songbook.
 */
export function buildSongbook(docx: Docx, content: SongbookContent): Songbook {
  const { options, measure = approximateMeasure, tagIcons = new Map<number, Uint8Array>() } = content;
  const songs = content.songs.map((song) => printSong(song, options));
  const partsOfMass = options.addPartsOfMass ? content.partsOfMass.map((song) => printSong(song, options, false)) : [];

  const planned: PlanSection[] = [
    ...(songs.length ? [{ title: SECTION_TITLES.songs, songs }] : []),
    ...(partsOfMass.length ? [{ title: SECTION_TITLES.partsOfMass, songs: partsOfMass }] : []),
    ...(options.addGadzinki ? [{ title: GADZINKI_TITLE, height: gadzinkiHeight(measure) }] : []),
    ...(options.notesPages > 0 ? [{ title: SECTION_TITLES.notes, height: options.notesPages * BODY_HEIGHT }] : []),
  ];
  const plan = planSongbook(planned, { toc: options.toc }, measure);

  const sections: DocumentSection[] = [];
  const current = () => sections[sections.length - 1];
  const hasContent = () => sections.some((section) => section.children.length);
  const startSection = (columns: 1 | 2, gap?: number) => {
    if (current() && !current().children.length) {
      Object.assign(current(), { columns, gap });
    } else {
      sections.push({ columns, gap, children: [] });
    }
  };
  const add = (...children: FileChild[]) => current().children.push(...children);
  const verseNumbers = new Set<number>();
  let verses = 0;
  const numberVerse: NumberVerse = (number) => {
    verseNumbers.add(Number(number));
    return { reference: verseNumberingReference(Number(number)), level: 0, instance: ++verses };
  };
  const icon = (id: number, size = ICON_PX) => {
    const data = tagIcons.get(id);
    return data ? [new docx.ImageRun({ type: 'png', data, transformation: { width: size, height: size } })] : [];
  };

  sections.push({ columns: 1, pageNumbers: true, children: [] });

  if (options.toc) {
    add(new docx.Paragraph({ style: STYLE.tocHeading, pageBreakBefore: hasContent(), text: SECTION_TITLES.toc }));
    startSection(2, TOC_COLUMN_GAP);
    planned.forEach((section, index) => {
      add(tocEntry(docx, STYLE.toc1, section.title, sectionBookmark(index), plan.sectionPages[index], []));
      (section.songs ?? []).forEach((song, songIndex) =>
        add(
          tocEntry(
            docx,
            STYLE.toc2,
            tocEntryText(song),
            songBookmark(song),
            plan.songs[index][songIndex].page,
            song.tagIds.flatMap((id) => icon(id, TOC_ICON_PX)),
          ),
        ),
      );
    });
    startSection(1);
  }

  planned.forEach((section, index) => {
    add(sectionTitle(docx, section.title, sectionBookmark(index), hasContent()));

    if (section.songs) {
      section.songs.forEach((song, songIndex) => {
        const layout = plan.songs[index][songIndex];
        const icons = song.tagIds.flatMap((id) => icon(id));

        add(songHeading(docx, song, layout, icons));

        const columnsFrom = layout.columnsFrom ?? song.stanzas.length;
        const last = song.stanzas.length - 1;

        if (layout.covered) {
          const moreAfter = layout.covered <= last && columnsFrom > layout.covered;
          add(songTable(docx, song, layout, layout.keepTogether && moreAfter, numberVerse));
        }

        song.stanzas.slice(layout.covered).forEach((stanza, offset) => {
          const stanzaIndex = layout.covered + offset;

          if (stanzaIndex === columnsFrom) {
            startSection(2, COLUMN_GAP);
          }

          const keepNext = layout.keepTogether && stanzaIndex < Math.min(last, columnsFrom);
          add(stanzaParagraph(docx, stanza, numberVerse, keepNext, layout.compact));
        });

        if (columnsFrom < song.stanzas.length) {
          startSection(1);
        }
      });
    } else if (section.title === GADZINKI_TITLE) {
      add(...gadzinkiParagraphs(docx, numberVerse));
    } else {
      add(...notesBlocks(docx, options.notesPages, (id) => icon(id)));
    }
  });

  const document = new docx.Document({
    creator: 'Спеўнік',
    title: 'Спеўнік',
    features: { updateFields: true },
    styles: songbookStyles(docx),
    numbering: { config: [...verseNumbers].map((number) => verseNumbering(docx, number)) },
    sections: sections
      .filter((section) => section.children.length)
      .map((section, index) => ({
        properties: {
          ...(index ? { type: docx.SectionType.CONTINUOUS } : {}),
          page: { size: { width: PAGE.width, height: PAGE.height }, margin: PAGE.margin },
          ...(section.columns === 2 ? { column: { count: 2, space: section.gap, equalWidth: true } } : {}),
        },
        ...(section.pageNumbers ? { footers: { default: footer(docx) } } : {}),
        children: section.children,
      })),
  });

  return { document, plan, songs: [...songs, ...partsOfMass] };
}

/**
 * A thick rule on both sides of the page number, as in the 2023 songbook.
 * The rules are cell borders, which every word processor draws the same way, unlike tab leaders.
 */
function footer(docx: Docx): Footer {
  const none = { style: docx.BorderStyle.NONE, size: 0, color: 'auto' };
  const ruleWidth = (BODY_WIDTH - FOOTER.numberWidth) / 2;
  const rule = () =>
    new docx.Paragraph({
      style: STYLE.footer,
      spacing: { line: FOOTER.ruleLine, lineRule: docx.LineRuleType.EXACT },
      border: { bottom: { style: docx.BorderStyle.SINGLE, size: FOOTER.ruleSize, space: 0, color: '000000' } },
    });
  const cell = (children: Paragraph[], width: number) =>
    new docx.TableCell({
      width: { size: width, type: docx.WidthType.DXA },
      verticalAlign: docx.VerticalAlignTable.CENTER,
      borders: { top: none, bottom: none, left: none, right: none },
      children,
    });
  const pageNumber = new docx.Paragraph({
    style: STYLE.footer,
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ children: [docx.PageNumber.CURRENT] })],
  });

  return new docx.Footer({
    children: [
      new docx.Table({
        width: { size: BODY_WIDTH, type: docx.WidthType.DXA },
        columnWidths: [ruleWidth, FOOTER.numberWidth, ruleWidth],
        layout: docx.TableLayoutType.FIXED,
        borders: docx.TableBorders.NONE,
        margins: { left: 0, right: 0, top: 0, bottom: 0 },
        rows: [
          new docx.TableRow({
            children: [cell([rule()], ruleWidth), cell([pageNumber], FOOTER.numberWidth), cell([rule()], ruleWidth)],
          }),
        ],
      }),
    ],
  });
}

function sectionTitle(docx: Docx, title: string, bookmark: string, pageBreakBefore: boolean): Paragraph {
  return new docx.Paragraph({
    heading: docx.HeadingLevel.HEADING_1,
    pageBreakBefore,
    children: [new docx.Bookmark({ id: bookmark, children: [new docx.TextRun(title)] })],
  });
}

function tocEntry(
  docx: Docx,
  style: string,
  text: string,
  bookmark: string,
  page: number,
  icons: ParagraphChild[],
): Paragraph {
  return new docx.Paragraph({
    style,
    tabStops: tocTabStops(docx),
    children: [
      new docx.InternalHyperlink({ anchor: bookmark, children: [new docx.TextRun(text)] }),
      new docx.TextRun({ children: [new docx.Tab()] }),
      ...icons,
      new docx.TextRun({ children: [new docx.Tab()] }),
      // Word puts the real page number in when it updates the fields on opening
      new docx.SimpleField(`PAGEREF ${bookmark} \\h`, String(page)),
    ],
  });
}

function songHeading(docx: Docx, song: PrintSong, layout: SongLayout, icons: ParagraphChild[]): Paragraph {
  const text = song.number ? `${song.number}. ${song.title}` : song.title;

  return new docx.Paragraph({
    heading: docx.HeadingLevel.HEADING_2,
    pageBreakBefore: layout.pageBreakBefore,
    // the hanging indent is there for the number
    ...(song.number ? {} : { indent: { left: 0, hanging: 0 } }),
    children: [
      new docx.Bookmark({ id: songBookmark(song), children: [new docx.TextRun(text)] }),
      ...(icons.length ? [new docx.TextRun({ children: [new docx.Tab()] }), ...icons] : []),
    ],
  });
}

/** "Проігрыш:" in italics, then the chords in the chord font */
function interludeRuns(docx: Docx, row: ChordRow): TextRun[] {
  return [
    new docx.TextRun({ text: `${row.label} `, italics: true, bold: false }),
    ...chordLineRuns(row.chords).map(
      ({ text, superscript }) =>
        new docx.TextRun({
          text,
          superScript: superscript,
          font: FONTS.chords,
          bold: true,
          characterSpacing: CHORDS.letterSpacing,
        }),
    ),
  ];
}

function chordRuns(docx: Docx, { chords, letterSpacing }: ChordRow, breakBefore: boolean): TextRun[] {
  const runs = chordLineRuns(chords);

  if (!runs.length) {
    return [new docx.TextRun({ text: '', break: breakBefore ? 1 : undefined })];
  }

  return runs.map(
    ({ text, superscript }, index) =>
      new docx.TextRun({
        text,
        superScript: superscript,
        characterSpacing: letterSpacing,
        break: breakBefore && index === 0 ? 1 : undefined,
      }),
  );
}

/**
 * The stanzas with chords and the chords sit side by side in a borderless table, as the 2023 songbook shows them,
 * one table row for every line: a line that wraps only makes its own row taller,
 * so the chords of the lines after it stay level with them whatever the measuring got wrong.
 * A table rather than a floating frame keeps lyrics and chords on the same page and the heading clear of them.
 */
function songTable(
  docx: Docx,
  song: PrintSong,
  layout: SongLayout,
  keepNext: boolean,
  numberVerse: NumberVerse,
): Table {
  const none = { style: docx.BorderStyle.NONE, size: 0, color: 'auto' };
  const borders = { top: none, bottom: none, left: none, right: none };
  const chordsWidth = layout.chordWidth + CHORDS.fromText;
  const lyricsWidth = BODY_WIDTH - chordsWidth;
  const after = layout.compact ? COMPACT.after : STANZA_AFTER;
  const line = layout.compact ? COMPACT.line : LINE;

  const chordCell = (row: ChordRow, spacing: ISpacingProperties) =>
    new docx.TableCell({
      width: { size: chordsWidth, type: docx.WidthType.DXA },
      borders,
      margins: { left: CHORDS.fromText + CHORDS.cellMargin, right: 0, top: 0, bottom: 0 },
      children: [
        new docx.Paragraph({ style: STYLE.chords, keepLines: true, spacing, children: chordRuns(docx, row, false) }),
      ],
    });

  const rows = song.stanzas.slice(0, layout.covered).flatMap((stanza, stanzaIndex) => {
    const chords = layout.chordParagraphs[stanzaIndex]?.rows ?? [];

    // an interlude before the first words comes above the verse number
    const numbered = Math.max(0, stanza.lines.findIndex(({ text }) => text));

    return stanza.lines.map((lyrics, lineIndex) => {
      const first = lineIndex === 0;
      const before = stanza.number && lineIndex < numbered;
      const last = lineIndex === stanza.lines.length - 1;
      const spacing = {
        before: first ? stanzaBefore(stanza.kind) : 0,
        after: last ? after : 0,
        line,
        lineRule: docx.LineRuleType.EXACT,
      };
      // a stanza stays whole, a song that fits on a page stays whole too
      const keep = !last || keepNext || stanzaIndex < layout.covered - 1;
      const fit = layout.lineFits[stanzaIndex]?.[lineIndex];
      // a line without chords runs over the chord column, and so does an interlude
      const row = chords[lineIndex];
      const withChords = !!row?.chords && !row.label;

      return new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({
            width: { size: withChords ? lyricsWidth : BODY_WIDTH, type: docx.WidthType.DXA },
            ...(withChords ? {} : { columnSpan: 2 }),
            borders,
            children: [
              new docx.Paragraph({
                style: STANZA_STYLES[stanza.kind],
                keepLines: true,
                keepNext: keep && (layout.keepTogether || !last),
                spacing,
                ...(lineIndex === numbered && stanza.number ? { numbering: numberVerse(stanza.number) } : {}),
                // the number hangs in front of the first line, the other lines line up with the text after it
                ...(stanza.number
                  ? {
                    indent: before
                      ? { left: 0, hanging: 0 }
                      : { left: VERSE_INDENT, hanging: lineIndex === numbered ? VERSE_INDENT : 0 },
                  }
                  : {}),
                children: [
                  new docx.TextRun({ text: lyrics.text, size: fit?.size, characterSpacing: fit?.letterSpacing }),
                  ...(row?.label ? interludeRuns(docx, row) : []),
                ],
              }),
            ],
          }),
          ...(withChords ? [chordCell(chords[lineIndex], spacing)] : []),
        ],
      });
    });
  });

  return new docx.Table({
    width: { size: BODY_WIDTH, type: docx.WidthType.DXA },
    columnWidths: [lyricsWidth, chordsWidth],
    layout: docx.TableLayoutType.FIXED,
    borders: docx.TableBorders.NONE,
    margins: { left: 0, right: 0, top: 0, bottom: 0 },
    rows,
  });
}

const STANZA_STYLES: Record<StanzaKind, string | undefined> = {
  verse: STYLE.verse,
  chorus: STYLE.refrain,
  bridge: STYLE.bridge,
  plain: undefined,
};

const compactSpacing = (docx: Docx) => ({
  line: COMPACT.line,
  lineRule: docx.LineRuleType.EXACT,
  after: COMPACT.after,
});

/** A stanza without chords beside it, as one paragraph; a long song is set a little tighter */
function stanzaParagraph(
  docx: Docx,
  stanza: Stanza,
  numberVerse: NumberVerse,
  keepNext: boolean,
  compact = false,
): Paragraph {
  const lines = stanza.lines.filter(({ text }) => text);

  return new docx.Paragraph({
    style: STANZA_STYLES[stanza.kind],
    keepLines: true,
    keepNext,
    ...(compact ? { spacing: compactSpacing(docx) } : {}),
    ...(stanza.number && stanza.kind !== 'verse' ? { indent: { left: VERSE_INDENT, hanging: VERSE_INDENT } } : {}),
    ...(stanza.number ? { numbering: numberVerse(stanza.number) } : {}),
    children: lines.map(({ text }, index) => new docx.TextRun({ text, break: index ? 1 : undefined })),
  });
}

function gadzinkiBlock(docx: Docx, block: GadzinkiBlock, numberVerse: NumberVerse): Paragraph[] {
  switch (block.kind) {
    case 'list':
      return block.items.map((item, index) =>
        stanzaParagraph(
          docx,
          { kind: 'verse', number: String(index + 1), lines: item.split('\n').map((text) => ({ text, chords: '' })) },
          numberVerse,
          false,
        ),
      );
    case 'subtitle':
      return [new docx.Paragraph({ style: STYLE.refrain, keepNext: true, text: block.text })];
    case 'lines':
      return [
        new docx.Paragraph({
          style: STYLE.bridge,
          keepLines: true,
          children: block.lines.flatMap((line, lineIndex) =>
            line.map(
              ({ text, bold }, index) =>
                new docx.TextRun({ text, bold, break: lineIndex && index === 0 ? 1 : undefined }),
            ),
          ),
        }),
      ];
  }
}

function gadzinkiParagraphs(docx: Docx, numberVerse: NumberVerse): Paragraph[] {
  return GADZINKI.flatMap((section) => [
    new docx.Paragraph({ heading: docx.HeadingLevel.HEADING_3, text: section.title }),
    ...section.blocks.flatMap((block) => gadzinkiBlock(docx, block, numberVerse)),
  ]);
}

const noBorder = (docx: Docx) => ({ style: docx.BorderStyle.NONE, size: 0, color: 'auto' });

/** What the tag icons mean, then ruled lines to fill the pages */
function notesBlocks(docx: Docx, pages: number, icon: (id: number) => ParagraphChild[]): FileChild[] {
  const tags = TAGS_LIST.filter(({ id }) => icon(id).length);
  const half = Math.ceil(tags.length / 2);
  const legendColumn = (column: typeof tags) =>
    new docx.TableCell({
      borders: docx.TableBorders.NONE,
      width: { size: 50, type: docx.WidthType.PERCENTAGE },
      children: column.length
        ? column.map(
          (tag) =>
            new docx.Paragraph({
              style: STYLE.legend,
              children: [...icon(tag.id), new docx.TextRun(` – ${tag.title}`)],
            }),
        )
        : [new docx.Paragraph('')],
    });
  const legendRows = Math.max(half, 1);
  const legendHeight = SECTION_TITLE.line + SECTION_TITLE.after + legendRows * (ICON_PX * 15 + 40) + 2 * NOTE_LINE;
  const linesPerPage = Math.floor(BODY_HEIGHT / NOTE_LINE);
  const lines = Math.max(0, Math.floor((BODY_HEIGHT - legendHeight) / NOTE_LINE) + (pages - 1) * linesPerPage);
  const rule = { style: docx.BorderStyle.SINGLE, size: 4, color: '808080' };

  return [
    ...(tags.length
      ? [
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          borders: docx.TableBorders.NONE,
          rows: [new docx.TableRow({ children: [legendColumn(tags.slice(0, half)), legendColumn(tags.slice(half))] })],
        }),
        new docx.Paragraph({ spacing: { after: NOTE_LINE } }),
      ]
      : []),
    ...(lines
      ? [
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          borders: docx.TableBorders.NONE,
          rows: Array.from(
            { length: lines },
            () =>
              new docx.TableRow({
                height: { value: NOTE_LINE, rule: docx.HeightRule.EXACT },
                children: [
                  new docx.TableCell({
                    borders: { top: noBorder(docx), left: noBorder(docx), right: noBorder(docx), bottom: rule },
                    children: [new docx.Paragraph('')],
                  }),
                ],
              }),
          ),
        }),
      ]
      : []),
  ];
}
