import { TestBed } from '@angular/core/testing';

import { ChordService } from './chord.service';

describe('ChordService', () => {
  let service: ChordService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChordService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getChordsList', () => {
    const types = (line: string) => service.getChordsList([line])[0]
      .filter((item) => item.text.trim())
      .map((item) => item.type);

    it('should not find chords inside lyrics', () => {
      expect(types('Adonai, Adonai')).toEqual(['text', 'text']);
    });

    it('should find glued lowercase short notation', () => {
      expect(types('DGeaDGDG eCGD')).toEqual(Array(12).fill('chord'));
    });

    it('should find slash, German sharp and 7sus chords', () => {
      expect(types('A/B G/C C#m/E Cis B7sus')).toEqual(['chord', 'chord', 'chord', 'chord', 'chord']);
    });

    it('should find plain and glued chords', () => {
      expect(types('Am C7 G')).toEqual(['chord', 'chord', 'chord']);
      expect(types('AmDm CGD')).toEqual(['chord', 'chord', 'chord', 'chord', 'chord']);
    });

    it('should support short lowercase notation', () => {
      expect(types('a d7 c# bb')).toEqual(['chord', 'chord', 'chord', 'chord']);
      expect(service.getChord('a').key).toBe('A');
      expect(service.getChord('a').suffix).toBe('minor');
    });

    it('should treat German H as English B', () => {
      expect(types('H Hm H7 A/H h')).toEqual(Array(5).fill('chord'));
      expect(service.getChord('H').key).toBe('B');
      expect(service.getChord('Hm').suffix).toBe('minor');
      expect(service.getChord('h').key).toBe('B');
      expect(service.getChord('h').suffix).toBe('minor');
    });

    it('should keep special symbols around chords when shortening', () => {
      expect(service.getTextAndChord('FCd E4  (E7)').chord).toBe('FCd E4 (E7)\n');
    });

    it('should pair each chord line with the lyrics line under it', () => {
      expect(service.getTextAndChord('Am    G\nСнова вечер\n\nИ опять\nC  E7\nИ снова')).toEqual({
        chord: 'a G\n\n\nC E7\n',
        text: 'Снова вечер\n\nИ опять\nИ снова\n',
      });
    });

    it('should save a stanza label and a directive as lyrics lines with empty chord rows', () => {
      expect(service.getTextAndChord('{columns: 2}\nПрыпеў:\nAm  G\nСнова вечер')).toEqual({
        chord: '\n\na G\n',
        text: '{columns: 2}\nПрыпеў:\nСнова вечер\n',
      });
    });

    it('should save chords typed in Cyrillic with Latin letters', () => {
      expect(service.getTextAndChord('Аm  С\nСнова вечер').chord).toBe('a C\n');
    });

    it('should keep a section label and bars on the chord line', () => {
      expect(service.getTextAndChord('Вступление:  Am  | G |').chord).toBe('Вступление: a | G |\n');
    });

    it('should save inline chords as a chord line', () => {
      expect(service.getTextAndChord('[Am]Снова [G]вечер')).toEqual({ chord: 'a G\n', text: 'Снова вечер\n' });
    });

    it('should keep rows paired when inline chords follow a chord line', () => {
      expect(service.getTextAndChord('Am G\n[C]Снова вечер\nИ опять')).toEqual({
        chord: 'a G\nC\n\n',
        text: '\nСнова вечер\nИ опять\n',
      });
    });

    it('should keep the original text of the line', () => {
      const line = 'Am  Adonai, C';

      expect(service.getChordsList([line])[0].map((item) => item.text).join('')).toBe(line);
    });
  });

  describe('mergeTextAndChord', () => {
    it('should put chord lines over their lyrics and skip empty ones', () => {
      expect(service.mergeTextAndChord({ chord: 'a G\n\nC', text: 'Снова вечер\nИ опять\nИ снова' })).toBe(
        'a G\nСнова вечер\nИ опять\nC\nИ снова',
      );
    });

    it('should restore what getTextAndChord split', () => {
      const text = 'Am G\nСнова вечер\n\nИ опять';

      expect(service.mergeTextAndChord(service.getTextAndChord(text)).trimEnd()).toBe('a G\nСнова вечер\n\nИ опять');
    });
  });

  describe('transposeChord', () => {
    const transpose = (line: string, steps: number) =>
      line.split(' ').map((chord) => service.transposeChord(chord, steps)).join(' ');

    it('should transpose plain chords in the short notation', () => {
      expect(transpose('C G Am F', 2)).toBe('D A b G');
      expect(transpose('Cmaj7 Am7 Cm7b5 Cdim7', 1)).toBe('C#maj7 bb7 c#7b5 C#dim7');
    });

    it('should transpose D# and Eb chords', () => {
      expect(transpose('Eb Ebm D# D#7', 2)).toBe('F f F F7');
      expect(transpose('Eb', -1)).toBe('D');
    });

    it('should treat alias spellings equally', () => {
      expect(transpose('A# Bb Db C# Ab G# H', 1)).toBe('B B D D A A C');
      expect(transpose('a cis h d#', 1)).toBe('bb D c e');
    });

    it('should match the notation the song editor saves', () => {
      ['Eb', 'Bbm7', 'Am/G', 'D/F#', 'Ab7', 'Hm'].forEach((chord) => {
        expect(service.transposeChord(chord, 12)).toBe(service.getShortChord(service.getChord(chord)));
      });
    });

    it('should wrap around the octave', () => {
      expect(transpose('C D E F G A B', 11)).toBe('B C# D# E F# G# Bb');
      expect(transpose('C D E F G A B', -11)).toBe('C# D# F F# G# Bb C');
    });

    it('should transpose the bass of slash chords', () => {
      expect(transpose('C/E G/B Am/G C7/G', 2)).toBe('D/F# A/C# b/A D7/A');
      expect(transpose('A/B A/H', 2)).toBe('B/C# B/C#');
    });

    it('should output the full notation when asked', () => {
      const full = (line: string, steps: number) =>
        line.split(' ').map((chord) => service.transposeChord(chord, steps, 'full')).join(' ');

      expect(full('a c#7 bb7 C D/F# b/A', 0)).toBe('Am C#m7 Bbm7 C D/F# Bm/A');
      expect(full('a Am7 A/B', 2)).toBe('Bm Bm7 B/C#');
    });

    it('should keep unknown text as is', () => {
      expect(service.transposeChord('Adonai', 3)).toBe('Adonai');
    });
  });
});
