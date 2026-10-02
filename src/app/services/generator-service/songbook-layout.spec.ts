import { Stanza } from '../chord/song-structure';
import { ChordParagraph, approximateMeasure, layoutSong, lineCount, planSongbook } from './songbook-layout';
import { PrintSong } from './songbook-model';
import { BODY_HEIGHT, BODY_WIDTH, FONTS } from './songbook-styles';

const plain = (...lines: [string, string?][]): Stanza => ({
  kind: 'plain',
  lines: lines.map(([text, chords = '']) => ({ text, chords })),
});
const verse = (number: string, ...lines: [string, string?][]): Stanza => ({
  ...plain(...lines),
  kind: 'verse',
  number,
});

const song = (stanzas: Stanza[], fields: Partial<PrintSong> = {}): PrintSong => ({
  id: 1,
  number: 1,
  title: 'ПЕСНЯ',
  tagIds: [],
  stanzas,
  issues: [],
  ...fields,
});

const chordRows = ({ rows }: ChordParagraph) => rows.map(({ chords }) => chords);

// about 50 letters fit beside a narrow chord column, 57 across the page
const LONG_LINE = 'Слова '.repeat(12).trim();

describe('songbook-layout', () => {
  describe('lineCount', () => {
    const style = { font: FONTS.text, size: 26 };

    it('should wrap words that do not fit', () => {
      expect(lineCount('a b c d', 3000, style, approximateMeasure)).toBe(1);
      expect(lineCount(LONG_LINE, 6000, style, approximateMeasure)).toBe(2);
    });

    it('should break a word wider than the line', () => {
      expect(lineCount('a'.repeat(100), 6000, style, approximateMeasure)).toBe(3);
    });
  });

  describe('layoutSong', () => {
    it('should give every stanza up to the last chords a chord row for each of its lines', () => {
      const layout = layoutSong(
        song([
          verse('1', ['Раз', 'a G'], [LONG_LINE, 'C']),
          plain(['Прыпеў'], ['Без акордаў']),
          verse('2', ['Тры', 'E']),
          verse('3', ['Чатыры']),
        ]),
        approximateMeasure,
      );

      expect(layout.chordWidth).toBeGreaterThan(0);
      expect(layout.chordParagraphs.map(chordRows)).toEqual([['a G', 'C'], ['', ''], ['E']]);
      expect(layout.covered).toBe(3);
    });

    it('should squeeze the chords and then the line before letting a line wrap beside the chords', () => {
      const layout = layoutSong(song([plain([`${'Слова '.repeat(9)}х`, 'a G'])]), approximateMeasure);

      expect(layout.chordParagraphs[0].rows).toHaveLength(1);
      expect(layout.chordParagraphs[0].rows[0].letterSpacing).toBeLessThan(-10);
      expect(layout.lineFits[0][0]).toEqual({ letterSpacing: -6 });
    });

    it('should keep one space between chords, however they were spaced over the syllables', () => {
      const layout = layoutSong(song([plain(['Раз', 'e    a b  e'])]), approximateMeasure);

      expect(layout.chordParagraphs[0].rows).toEqual([{ chords: 'e a b e' }]);
    });

    it('should let a line without chords run over the chord column', () => {
      const long = `${'Слова '.repeat(9)}х`;
      const layout = layoutSong(song([plain([long], ['Раз', 'a G'])]), approximateMeasure);

      expect(layout.lineFits[0]).toEqual([undefined, undefined]);
      expect(layout.chordParagraphs[0].rows[1]).toEqual({ chords: 'a G' });
    });

    it('should give a named interlude a line of its own, out of the chord column', () => {
      const layout = layoutSong(
        song([verse('2', ['', 'Проігрыш: E F# C# A //x2'], ['Доўгацерпіць', 'C#'])]),
        approximateMeasure,
      );

      expect(layout.chordParagraphs[0].rows[0]).toEqual({ label: 'Проігрыш:', chords: 'E F# C# A (x2)' });
      expect(layout.chordParagraphs[0].rows[1]).toEqual({ chords: 'C#' });
      const inColumn = layoutSong(song([plain(['Раз', 'E F# C# A //x2'])]), approximateMeasure);
      expect(layout.chordWidth).toBeLessThan(inColumn.chordWidth);
    });

    it('should leave lines and chords as they are when they fit', () => {
      const layout = layoutSong(song([plain(['Раз', 'a G'])]), approximateMeasure);

      expect(layout.chordParagraphs[0].rows).toEqual([{ chords: 'a G' }]);
      expect(layout.lineFits).toEqual([[undefined]]);
    });

    it('should leave out the chord table without chords', () => {
      const layout = layoutSong(song([plain(['Раз'], ['Два'])]), approximateMeasure);

      expect(layout).toMatchObject({ chordWidth: 0, chordParagraphs: [], covered: 0, cantSplit: false });
      expect(layout.keepTogether).toBe(true);
      expect(layout.columnsFrom).toBeUndefined();
    });

    it('should put the stanzas up to the last chords beside them and make the row as tall as the taller side', () => {
      const short = layoutSong(song([plain(['Раз', 'a'], ['', 'G'], ['', 'C']), plain(['Два'])]), approximateMeasure);
      const tall = layoutSong(
        song([plain(['Раз', 'a'], ['', 'G'], ['', 'C'], ['', 'D']), plain(['Два'])]),
        approximateMeasure,
      );

      expect(short.chordParagraphs.map(chordRows)).toEqual([['a', 'G', 'C']]);
      expect(short).toMatchObject({ covered: 1, cantSplit: true });
      expect(tall.height).toBeGreaterThan(short.height);
    });

    it('should flow the verses after the chords into two columns when a song is too long for a page', () => {
      const verses = Array.from({ length: 12 }, (_, index) =>
        verse(String(index + 2), ['Кароткі радок'], ['Яшчэ радок'], ['І яшчэ'], ['І апошні']),
      );
      const layout = layoutSong(song([verse('1', ['Раз', 'a G']), ...verses]), approximateMeasure);

      expect(layout.columnsFrom).toBe(1);
      expect(layout.height).toBeLessThan(BODY_HEIGHT);
      expect(layout.keepTogether).toBe(true);
    });

    it('should set a song just over a page a little tighter to keep it on one page', () => {
      const stanzas = (count: number) =>
        Array.from({ length: count }, (_, index) => verse(String(index + 1), ['Раз'], ['Два'], ['Тры'], ['Чатыры']));

      expect(layoutSong(song(stanzas(7)), approximateMeasure)).toMatchObject({ compact: false, keepTogether: true });
      expect(layoutSong(song(stanzas(8)), approximateMeasure)).toMatchObject({ compact: true, keepTogether: true });
      // too long even set tighter: two columns or a break between stanzas instead
      expect(layoutSong(song(stanzas(12)), approximateMeasure).compact).toBe(false);
    });

    it('should not use two columns when the lines would wrap in them', () => {
      const long = Array.from({ length: 30 }, (_, index) => verse(String(index + 1), [LONG_LINE]));

      expect(layoutSong(song(long), approximateMeasure).columnsFrom).toBeUndefined();
    });
  });

  describe('planSongbook', () => {
    const tall = (id: number) =>
      song(
        Array.from({ length: 4 }, (_, index) => verse(String(index + 1), ['Радок'], ['Радок'], ['Радок'])),
        { id, number: id },
      );

    it('should move a song that does not fit what is left of a page to the next one', () => {
      const plan = planSongbook([{ title: 'Спевы', songs: [tall(1), tall(2), tall(3)] }], { toc: false });
      const [first, second, third] = plan.songs[0];

      expect(plan.sectionPages).toEqual([1]);
      expect([first.page, second.page, third.page]).toEqual([1, 1, 2]);
      expect(third.pageBreakBefore).toBe(false);
    });

    it('should count the contents before the songs', () => {
      const plan = planSongbook(
        [{ title: 'Спевы', songs: [tall(1)] }, { title: 'Нататкі', height: 2 * BODY_HEIGHT }],
        { toc: true },
      );

      expect(plan.tocPages).toBe(1);
      expect(plan.sectionPages).toEqual([2, 3]);
      expect(plan.songs[0][0].page).toBe(2);
      expect(plan.pages).toBe(5);
    });

    it('should break the page before a two-column song that does not fit, as columns stop "keep with next"', () => {
      const columnsSong = song(
        [verse('1', ['Раз', 'a']), ...[2, 3, 4, 5].flatMap((id) => tall(id).stanzas)],
        { id: 3 },
      );
      const plan = planSongbook([{ title: 'Спевы', songs: [tall(1), tall(2), columnsSong] }], { toc: false });

      expect(plan.songs[0][2]).toMatchObject({ pageBreakBefore: true, page: 2 });
      expect(plan.songs[0][2].columnsFrom).toBe(1);
    });

    it('should start a song longer than a page where its heading and first stanza fit, chords or not', () => {
      const withChords = song(
        Array.from({ length: 20 }, (_, index) => verse(String(index + 1), ['Радок', 'a'], ['Радок', 'G'])),
        { id: 2, number: 2 },
      );
      const plan = planSongbook([{ title: 'Спевы', songs: [tall(1), withChords] }], { toc: false });

      expect(plan.songs[0][1]).toMatchObject({ keepTogether: false, page: 1 });
      expect(plan.pages).toBe(2);
    });
  });

  it('should keep the page constants of the 2023 songbook', () => {
    expect(BODY_WIDTH).toBe(7427);
    expect(BODY_HEIGHT).toBe(11056);
  });
});
