import { isChord, parseSong, SongLine } from './song-parser';

const kinds = (text: string) => parseSong(text).map((line) => line.kind);
const chords = (line: SongLine) => ('chords' in line ? line.chords.map(({ chord }) => chord) : []);

describe('song-parser', () => {
  describe('isChord', () => {
    it('should accept chords by grammar, not by a dictionary', () => {
      ['Am', 'Am7', 'F#m7b5', 'Cmaj7/G', 'Hm', 'Esus4', 'A/B', 'Cadd9', 'B7sus', 'C#dim7', 'Bb', 'Cis', 'E4', 'D7(b9)']
        .forEach((chord) => expect(isChord(chord), chord).toBe(true));
    });

    it('should accept the short notation with a lowercase minor root', () => {
      ['a', 'd7', 'h', 'c#', 'db', 'fis', 'c#7b5', 'a/G'].forEach((chord) => expect(isChord(chord), chord).toBe(true));
    });

    it('should reject words', () => {
      ['am', 'Adonai', 'Do', 'I', 'Hello', 'mi'].forEach((word) => expect(isChord(word), word).toBe(false));
    });
  });

  describe('parseSong', () => {
    it('should split chord lines from lyrics', () => {
      expect(kinds('Am      G\nА я иду домой\n\nC   E7\nСнова вечер')).toEqual(
        ['chords', 'lyrics', 'empty', 'chords', 'lyrics'],
      );
    });

    it('should never find chords inside lyrics', () => {
      ['А я иду', 'С тобой', 'I am here', 'A love song', 'Adonai, Adonai', 'Em и я'].forEach((line) => {
        const [parsed] = parseSong(line);

        expect(parsed.kind, line).toBe('lyrics');
        expect(chords(parsed), line).toEqual([]);
      });
    });

    it('should keep chord columns', () => {
      expect(parseSong('Am    G/B  C')[0]).toEqual({
        kind: 'chords',
        text: 'Am    G/B  C',
        chords: [{ chord: 'Am', col: 0 }, { chord: 'G/B', col: 6 }, { chord: 'C', col: 11 }],
      });
    });

    it('should ignore bars, repeats and brackets on a chord line', () => {
      const lines = ['| Am | G |', '|: Am G :|', 'Am G (x2)', 'Am G x2', 'Am G 2р.', 'Am - G - C', '(E7)', 'N.C. Am'];

      lines.forEach((line) => {
        expect(parseSong(line)[0].kind, line).toBe('chords');
      });
      expect(chords(parseSong('(E7)')[0])).toEqual(['E7']);
    });

    it('should read transition arrows, alternatives in brackets and frets', () => {
      expect(chords(parseSong('E›B7›c#(A)')[0])).toEqual(['E', 'B7', 'c#', 'A']);
      expect(chords(parseSong('G# G(›D# B♭)')[0])).toEqual(['G#', 'G', 'D#', 'B♭']);
      expect(chords(parseSong('Ca(FG)(ea)')[0])).toEqual(['C', 'a', 'F', 'G', 'e', 'a']);
      expect(chords(parseSong('DC(VIII) GB♭')[0])).toEqual(['D', 'C', 'G', 'B♭']);
      expect(chords(parseSong('D7(b9) G')[0])).toEqual(['D7(b9)', 'G']);
    });

    it('should read a minor bass, a dangling slash and slashed repeats', () => {
      expect(chords(parseSong('C/Em F')[0])).toEqual(['C/Em', 'F']);
      expect(chords(parseSong('C2/ e G')[0])).toEqual(['C2', 'e', 'G']);
      expect(chords(parseSong('B f# /2р.')[0])).toEqual(['B', 'f#']);
      expect(chords(parseSong('Проігрыш: E F# //x2')[0])).toEqual(['E', 'F#']);
    });

    it('should keep dots over a lyrics line as an empty chord row', () => {
      expect(kinds('Am G\nСнова вечер\n.\nИ опять')).toEqual(['chords', 'lyrics', 'chords', 'lyrics']);
      expect(kinds('.\nИ опять')).toEqual(['lyrics', 'lyrics']);
    });

    it('should treat a line of repeats only as lyrics', () => {
      expect(kinds('x2')).toEqual(['lyrics']);
    });

    it('should split a section label from its chords', () => {
      const [line] = parseSong('Вступление: Am G C');

      expect(line.kind).toBe('chords');
      expect(line.kind === 'chords' && line.label).toBe('Вступление:');
      expect(chords(line)).toEqual(['Am', 'G', 'C']);
      expect(kinds('Припев:\nПрипев 2\nIntro')).toEqual(['label', 'label', 'label']);
    });

    it('should not take lyrics starting with a label word for a label', () => {
      expect(kinds('Мост через реку')).toEqual(['lyrics']);
    });

    it('should read chords typed with Cyrillic look-alike letters', () => {
      expect(chords(parseSong('Аm  С  Е7')[0])).toEqual(['Am', 'C', 'E7']);
    });

    it('should split glued chords on a chord line', () => {
      expect(chords(parseSong('AmDm CGD')[0])).toEqual(['Am', 'Dm', 'C', 'G', 'D']);
      expect(chords(parseSong('DGeaDGDG eCGD')[0])).toEqual(
        ['D', 'G', 'e', 'a', 'D', 'G', 'D', 'G', 'e', 'C', 'G', 'D'],
      );
    });

    it('should read inline ChordPro chords', () => {
      expect(parseSong('[Am]Снова [G]вечер')[0]).toEqual({
        kind: 'lyrics',
        text: 'Снова вечер',
        chords: [{ chord: 'Am', col: 0 }, { chord: 'G', col: 6 }],
      });
      expect(kinds('[Am] [G]')).toEqual(['chords']);
    });

    describe('short notation', () => {
      it('should accept a lowercase line with a strong chord', () => {
        expect(chords(parseSong('a  d7  E  a\nСнова вечер')[0])).toEqual(['a', 'd7', 'E', 'a']);
      });

      it('should accept weak lines in a song written in the short notation', () => {
        expect(kinds('a  d7  E\nСнова вечер\na    e\nИ опять')).toEqual(['chords', 'lyrics', 'chords', 'lyrics']);
        expect(kinds('d7   G\nСнова вечер\nа     с\nИ опять')).toEqual(['chords', 'lyrics', 'chords', 'lyrics']);
      });

      it('should accept lowercase minors in a song with uppercase majors', () => {
        expect(kinds('C\nСнова вечер\na\nИ опять\ne b\nИ снова')).toEqual(
          ['chords', 'lyrics', 'chords', 'lyrics', 'chords', 'lyrics'],
        );
      });

      it('should not take weak tokens for chords in a song without chords', () => {
        expect(kinds('а\nс тобой')).toEqual(['lyrics', 'lyrics']);
      });

      it('should keep English words made of note letters as lyrics', () => {
        expect(kinds('Am   G\nbad\nface')).toEqual(['chords', 'lyrics', 'lyrics']);
        expect(kinds('Am   G\nAh, ah, ah\nBad')).toEqual(['chords', 'lyrics', 'lyrics']);
      });
    });
  });
});
