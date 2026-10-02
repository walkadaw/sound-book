import { displayRows, normalizeLyrics, songStructure, withoutMarks } from './song-structure';

describe('song-structure', () => {
  describe('songStructure', () => {
    it('should split stanzas on empty lines and on verse numbers, keeping each chord row with its line', () => {
      const { stanzas, issues } = songStructure({
        text: 'Ruah (x3)\r\n\r\n1. Не сілай\r\n2. Ruah — святло\r\n3. Ruah — Дух',
        chord: 'e a B e B7\r\n\r\ne a B7 e',
      });

      expect(stanzas).toEqual([
        { kind: 'plain', lines: [{ text: 'Ruah (x3)', chords: 'e a B e B7' }] },
        { kind: 'verse', number: '1', lines: [{ text: 'Не сілай', chords: 'e a B7 e' }] },
        { kind: 'verse', number: '2', lines: [{ text: 'Ruah — святло', chords: '' }] },
        { kind: 'verse', number: '3', lines: [{ text: 'Ruah — Дух', chords: '' }] },
      ]);
      expect(issues).toEqual([]);
    });

    it('should take the stanza kind from a label line and leave the label out', () => {
      const { stanzas } = songStructure({
        text: '1. Ты даў мне сонца\nІду да Цябе\n\nПрыпеў:\nА без Цябе\nБез Цябе\n\nБрыдж:\nО-о-о',
        chord: 'd C\nB♭maj C d\n\n\nB♭maj7 C\n\n\n\nG',
      });

      expect(stanzas.map(({ kind }) => kind)).toEqual(['verse', 'chorus', 'bridge']);
      expect(stanzas[1].lines).toEqual([
        { text: 'А без Цябе', chords: 'B♭maj7 C' },
        { text: 'Без Цябе', chords: '' },
      ]);
      expect(stanzas[2].lines).toEqual([{ text: 'О-о-о', chords: 'G' }]);
    });

    it('should leave out "{name: value}" lines and report them', () => {
      const { stanzas, issues } = songStructure({ text: '{columns: 2}\nРаз', chord: '' });

      expect(stanzas).toEqual([{ kind: 'plain', lines: [{ text: 'Раз', chords: '' }] }]);
      expect(issues).toEqual([{ kind: 'unknown-directive', text: '{columns: 2}' }]);
    });

    it('should treat a row of dots as an empty chord row', () => {
      const { stanzas } = songStructure({ text: 'Святой\nТы Бог\nТы наш Царь', chord: 'A B\n.\n..' });

      expect(stanzas[0].lines.map(({ chords }) => chords)).toEqual(['A B', '', '']);
    });

    it('should keep chords over an empty line for the next stanza and chords past the lyrics for the last one', () => {
      const { stanzas, issues } = songStructure({ text: 'Раз\n\nДва', chord: '\nG D\n\nC\nE' });

      expect(stanzas).toEqual([
        { kind: 'plain', lines: [{ text: 'Раз', chords: '' }] },
        {
          kind: 'plain',
          lines: [
            { text: '', chords: 'G D' },
            { text: 'Два', chords: '' },
            { text: '', chords: 'C' },
            { text: '', chords: 'E' },
          ],
        },
      ]);
      expect(issues.map(({ kind }) => kind)).toEqual([
        'chords-without-lyrics',
        'chords-without-lyrics',
        'chords-without-lyrics',
      ]);
    });

    it('should report labels without a stanza, chords on a label and verse numbers out of order', () => {
      const { issues } = songStructure({ text: 'Прыпеў:\n\n2. Раз\n3. Два\nБрыдж:', chord: 'G' });

      expect(issues).toEqual([
        { kind: 'chords-on-hidden-line', text: 'Прыпеў:', chords: 'G' },
        { kind: 'label-without-stanza', text: 'Брыдж:' },
        { kind: 'verse-numbering', numbers: ['2', '3'] },
      ]);
    });
  });

  describe('normalizeLyrics', () => {
    it('should write every repeat the same way and replace odd spaces', () => {
      expect(normalizeLyrics('Табе хвала (х3)')).toBe('Табе хвала (x3)');
      expect(normalizeLyrics('хвaлы Тваёй. (2x)')).toBe('хвaлы Тваёй. (x2)');
      expect(normalizeLyrics('майго(х5)')).toBe('майго (x5)');
      expect(normalizeLyrics('Без Цябе ( × 2 ) ')).toBe('Без Цябе (x2)');
    });
  });

  describe('withoutMarks', () => {
    it('should leave only the lyrics, keeping the empty lines between stanzas', () => {
      expect(withoutMarks('{columns: 2}\n1. Раз\n\nПрыпеў:\nАллелюя\n\nПроігрыш: О-о-о')).toBe(
        '1. Раз\n\nАллелюя\n\nПроігрыш: О-о-о',
      );
    });
  });

  describe('displayRows', () => {
    it('should put the verse number in front of the first line with words', () => {
      const rows = displayRows(songStructure({ text: '1.Ой\n\n\n2.  Ай', chord: '\n\nE' }));

      expect(rows.map(({ text }) => text)).toEqual(['1. Ой', '', '', '2. Ай']);
    });

    it('should put one empty line between stanzas and the verse number in front', () => {
      const structure = songStructure({ text: '1. Раз\nДва\n\n\nПрыпеў:\nТры', chord: 'a\n\n\n\n\nC' });

      expect(displayRows(structure)).toEqual([
        { text: '1. Раз', chords: 'a', kind: 'verse' },
        { text: 'Два', chords: '', kind: 'verse' },
        { text: '', chords: '', kind: 'gap' },
        { text: 'Тры', chords: 'C', kind: 'chorus' },
      ]);
    });
  });
});
