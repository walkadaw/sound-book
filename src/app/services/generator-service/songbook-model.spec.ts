import { Song } from '../../interfaces/song';
import { songStructure } from '../chord/song-structure';
import { lengthIssues, mixedScriptWords, songIssues } from './songbook-issues';
import { PrintOptions, printSong, songTagIds } from './songbook-model';

const SONG: Song = {
  id: 14,
  songId: 12,
  title: ' АЛЛЕЛЮЯ ХВАЛА ПАНУ ',
  text: '1. Раз\n\nПрыпеў:\nАллелюя (х3)\n\n2. Два\n\nПрыпеў:\nАллелюя (x3)',
  chord: 'a C\n\n\nE a',
  tag: { 3: 1, 10: 1 },
};
const OPTIONS: PrintOptions = { showChords: true, showTags: true, repeatChoruses: true };

describe('songbook-model', () => {
  describe('printSong', () => {
    it('should keep the number, the tags without the parts of the mass and every stanza', () => {
      const song = printSong(SONG, OPTIONS);

      expect(song).toMatchObject({ id: 14, number: 12, title: 'АЛЛЕЛЮЯ ХВАЛА ПАНУ', tagIds: [3] });
      expect(song.stanzas.map(({ kind }) => kind)).toEqual(['verse', 'chorus', 'verse', 'chorus']);
    });

    it('should print a repeated refrain only once when asked to', () => {
      const song = printSong(SONG, { ...OPTIONS, repeatChoruses: false });

      expect(song.stanzas.map(({ kind }) => kind)).toEqual(['verse', 'chorus', 'verse']);
    });

    it('should leave out the number, the chords and the tags when they are not printed', () => {
      const song = printSong(SONG, { showChords: false, showTags: false, repeatChoruses: true }, false);

      expect(song.number).toBeUndefined();
      expect(song.tagIds).toEqual([]);
      expect(song.stanzas.flatMap(({ lines }) => lines.map(({ chords }) => chords)).filter(Boolean)).toEqual([]);
    });
  });

  describe('songTagIds', () => {
    it('should survive the empty array the API sends for a song without tags', () => {
      expect(songTagIds({ tag: [] as unknown as Song['tag'] })).toEqual([]);
    });
  });

  describe('songIssues', () => {
    it('should report mistakes and hint at a missing refrain label', () => {
      const song = { ...SONG, title: 'БIЦЕ Ў ЛАДКI', text: '1. Раз\n\nБез меткі\n\n3. Тры', chord: '' };

      expect(songIssues(song, songStructure(song)).map(({ message, hint }) => ({ message, hint }))).toEqual([
        { message: 'Нумары куплетаў ідуць не па парадку: 1, 3', hint: undefined },
        { message: 'У назве лацінскія літары сярод кірылічных: «БIЦЕ»', hint: undefined },
        { message: 'У назве лацінскія літары сярод кірылічных: «ЛАДКI»', hint: undefined },
        {
          message: 'Страфа без нумара сярод куплетаў: калі гэта прыпеў, дадайце над ёй радок «Прыпеў:»',
          hint: true,
        },
      ]);
    });

    it('should hint at a song too long for a page', () => {
      const line = 'Доўгі радок песні, які не змесціцца ў вузкай калонцы побач з другім';
      const long = { ...SONG, text: Array.from({ length: 30 }, (_, index) => `${index + 1}. ${line}`).join('\n\n') };

      expect(lengthIssues(SONG, OPTIONS)).toEqual([]);
      expect(lengthIssues(long, OPTIONS)).toEqual([
        { song: long, hint: true, message: 'Песня даўжэйшая за старонку, яе страфы трапяць на розныя старонкі' },
      ]);
    });

    it('should leave words in one script alone', () => {
      expect(mixedScriptWords('Ruah — Дух Святы, Ave Maria')).toEqual([]);
    });
  });
});
