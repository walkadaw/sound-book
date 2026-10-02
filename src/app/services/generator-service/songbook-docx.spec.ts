import * as docx from 'docx';
import JSZip from 'jszip';
import { Song } from '../../interfaces/song';
import { PaperOptions, buildSongbook } from './songbook-docx';
import { obfuscateFont, packSongbook } from './songbook-package';

const song = (fields: Partial<Song>): Song => ({
  id: 1,
  songId: 1,
  title: 'ПЕСНЯ',
  text: '',
  chord: '',
  tag: {},
  ...fields,
});

const OPTIONS: PaperOptions = {
  showChords: true,
  showTags: true,
  repeatChoruses: true,
  addPartsOfMass: true,
  addGadzinki: false,
  toc: true,
  notesPages: 1,
  title: '',
  subtitle: '',
};

const SONGS = [
  song({
    id: 7,
    songId: 3,
    title: 'ХВАЛА',
    text: '1. Першы радок\nДругі радок\n\nПрыпеў:\nХвала (х2)\n\n2. Трэці радок',
    chord: 'a G\nB♭ A7\n\n\nC',
    tag: { 6: 1 },
  }),
  song({ id: 8, songId: 4, title: 'СЛАВА', text: 'Без акордаў', tag: [] as unknown as Song['tag'] }),
  song({
    id: 9,
    songId: 5,
    title: 'ДОЎГАЯ',
    // a directive line does nothing any more and is not printed
    text: `{columns: 2}\n${Array.from({ length: 18 }, (_, index) => `${index + 1}. Радок\nРадок\nРадок`).join('\n\n')}`,
    chord: '\nE',
  }),
];
const MASS = [song({ id: 20, songId: 50, title: 'СВЯТЫ', text: 'Святы, святы', tag: { 10: 1 } })];

const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (char) => char.charCodeAt(0),
);

async function songbookZip(options: Partial<PaperOptions> = {}, fonts = [] as Parameters<typeof packSongbook>[2]) {
  const { document } = buildSongbook(docx, {
    songs: SONGS,
    partsOfMass: MASS,
    options: { ...OPTIONS, ...options },
    tagIcons: new Map([[6, PNG]]),
  });
  return JSZip.loadAsync(await packSongbook(docx, document, fonts));
}

const read = async (zip: JSZip, path: string) => zip.file(path)!.async('string');
const paragraphs = (xml: string) => xml.match(/<w:p>[\s\S]*?<\/w:p>|<w:p [\s\S]*?<\/w:p>/g) ?? [];
const paragraphWith = (xml: string, text: string, style?: string) =>
  paragraphs(xml).find((p) => p.includes(`>${text}<`) && (!style || p.includes(`<w:pStyle w:val="${style}"/>`))) ?? '';

describe('songbook-docx', () => {
  let xml: string;
  let zip: JSZip;

  beforeAll(async () => {
    zip = await songbookZip();
    xml = await read(zip, 'word/document.xml');
  });

  it('should lay the pages out as the 2023 songbook', async () => {
    const settings = await read(zip, 'word/settings.xml');

    expect(xml).toContain('<w:pgSz w:w="8391" w:h="11907"');
    expect(xml).toMatch(/<w:pgMar w:top="284" w:right="284" w:bottom="567" w:left="680" w:header="0" w:footer="113"/);
    expect(settings).toContain('<w:mirrorMargins/>');
    expect(settings).toContain('<w:updateFields/>');
  });

  it('should number the songs as the site does and bookmark them for the contents', () => {
    const heading = paragraphWith(xml, '3. ХВАЛА', 'Heading2');

    expect(heading).not.toBe('');
    expect(heading).toContain('w:name="song7"');
    // the tag icon sits after a tab at the right margin
    expect(heading).toMatch(/<w:tab\/>[\s\S]*<w:drawing>/);
    expect(paragraphWith(xml, 'СВЯТЫ', 'Heading2')).toContain('<w:ind w:left="0" w:hanging="0"/>');
  });

  it('should set every line with chords beside its chords in a borderless table row that is not split', () => {
    const table = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)![0];
    const rows = table.match(/<w:tr>[\s\S]*?<\/w:tr>/g)!;
    const [lyrics, chords] = rows[1].match(/<w:tc>[\s\S]*?<\/w:tc>/g)!;

    expect(table).not.toContain('<w:tblpPr');
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.includes('<w:cantSplit/>'))).toBe(true);
    expect(lyrics).toContain('Другі радок');
    expect(chords).toContain('<w:pStyle w:val="Chords"/>');
    expect(rows[2]).toContain('Хвала (x2)');
    expect(table).not.toContain('Трэці радок');
    expect(table).toContain('B♭ A');
    expect(table).toMatch(/<w:vertAlign w:val="superscript"\/>[\s\S]*?<w:t[^>]*>7<\/w:t>/);
  });

  it('should print the refrain in its own style without its label and keep the stanzas together', () => {
    const refrain = paragraphWith(xml, 'Хвала (x2)');

    expect(refrain).toContain('<w:pStyle w:val="Refrain"/>');
    expect(xml).not.toContain('Прыпеў:');
    expect(paragraphWith(xml, 'Першы радок')).toContain('<w:keepNext/>');
    expect(paragraphWith(xml, 'Першы радок')).toContain('<w:keepLines/>');
    expect(paragraphWith(xml, 'Трэці радок')).not.toContain('<w:keepNext/>');
  });

  it('should hang the verse number in front of the first line and line the next lines up with its text', () => {
    const first = paragraphWith(xml, 'Першы радок');

    expect(first).toContain('<w:pStyle w:val="ListParagraph"/>');
    expect(first).toMatch(/>1\.<\/w:t>[\s\S]*<w:tab\/>[\s\S]*Першы радок/);
    expect(paragraphWith(xml, 'Другі радок')).toContain('<w:ind w:left="284" w:hanging="0"/>');
  });

  it('should print a named interlude across the line, above the number of the verse it leads into', async () => {
    const withInterlude = song({
      id: 30,
      songId: 30,
      title: 'ПРОІГРЫШ',
      text: '1. Раз\n\n\n2. Два',
      chord: 'C#\n\nПроігрыш: E F# //x2',
    });
    const { document } = buildSongbook(docx, { songs: [withInterlude], partsOfMass: [], options: OPTIONS });
    const zipped = await JSZip.loadAsync(await packSongbook(docx, document, []));
    const rows = (await read(zipped, 'word/document.xml')).match(/<w:tr>[\s\S]*?<\/w:tr>/g)!;
    const interlude = rows.find((row) => row.includes('Проігрыш:'))!;
    const next = rows[rows.indexOf(interlude) + 1];

    expect(interlude).toContain('<w:gridSpan w:val="2"/>');
    expect(interlude).toContain('E F# (x2)');
    expect(interlude).not.toContain('>2.<');
    expect(next).toMatch(/>2\.<\/w:t>[\s\S]*Два/);
  });

  it('should flow the verses after the chords into two columns when the song is too long for a page', () => {
    expect(xml).toMatch(/<w:cols(?=[^>]*w:num="2")(?=[^>]*w:space="340")/);
    expect(xml).not.toContain('{columns: 2}');
    // a section break would otherwise leave an empty line before the columns
    expect(xml).not.toContain('<w:p><w:pPr><w:sectPr');
    expect(xml).toContain('<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>');
  });

  it('should list the sections and songs in the contents with page references', () => {
    expect(paragraphWith(xml, 'Змест')).toContain('<w:pStyle w:val="TOCHeading"/>');
    expect(xml).toMatch(/<w:fldSimple w:instr="PAGEREF song7 \\h"><w:r><w:t[^>]*>\d+<\/w:t><\/w:r><\/w:fldSimple>/);
    expect(xml).toContain('w:anchor="song7"');
    expect(xml).toContain('PAGEREF section0');
    expect(xml).toMatch(/<w:tab w:val="right" w:pos="\d+" w:leader="dot"\/>/);
  });

  it('should end with the notes and print page numbers between thick rules', async () => {
    const footers = await Promise.all(
      Object.keys(zip.files)
        .filter((path) => /^word\/footer\d+\.xml$/.test(path))
        .map((path) => read(zip, path)),
    );

    expect(paragraphWith(xml, 'Нататкі', 'Heading1')).not.toBe('');
    expect(xml).toContain(' – Марыйныя');
    expect(footers.some((footer) => footer.includes('PAGE') && /<w:bottom [^>]*w:sz="18"/.test(footer))).toBe(true);
  });

  it('should leave out what the options turn off', async () => {
    const plain = await read(
      await songbookZip({ showChords: false, showTags: false, toc: false, notesPages: 0, addPartsOfMass: false }),
      'word/document.xml',
    );

    expect(plain).not.toContain('<w:tbl>');
    expect(plain).not.toContain('<w:drawing>');
    expect(plain).not.toContain('PAGEREF');
    expect(plain).not.toContain('Нататкі');
    expect(plain).not.toContain('СВЯТЫ');
  });

  it('should add a title page without a page number', async () => {
    const titled = await songbookZip({ title: 'Спеўнік', subtitle: '2026' });
    const document = await read(titled, 'word/document.xml');

    expect(paragraphWith(document, 'Спеўнік')).toContain('<w:pStyle w:val="Title"/>');
    expect(paragraphWith(document, 'Змест')).toContain('<w:pageBreakBefore/>');
  });

  describe('packSongbook', () => {
    it('should embed every face of a family under one name, obfuscated', async () => {
      const data = Uint8Array.from({ length: 64 }, (_, index) => index);
      const packed = await songbookZip({}, [
        { family: 'Arsenal', style: 'regular', data },
        { family: 'Arsenal', style: 'bold', data },
        { family: 'DejaVu Math TeX Gyre', style: 'regular', data },
      ]);
      const table = await read(packed, 'word/fontTable.xml');
      const [, key] = /<w:embedBold r:id="rId2" w:fontKey="(\{[^}]+\})"\/>/.exec(table) ?? [];
      const font = await packed.file('word/fonts/font2.odttf')!.async('uint8array');

      expect(table.match(/<w:font /g)).toHaveLength(2);
      expect(table).toContain('<w:font w:name="Arsenal">');
      expect(await read(packed, 'word/settings.xml')).toContain('<w:embedTrueTypeFonts/><w:mirrorMargins/>');
      expect(await read(packed, 'word/_rels/fontTable.xml.rels')).toContain('Target="fonts/font3.odttf"');
      expect(font).not.toEqual(data);
      expect(obfuscateFont(font, key)).toEqual(data);
    });
  });
});
