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

    it('should keep the original text of the line', () => {
      const line = 'Am  Adonai, C';

      expect(service.getChordsList([line])[0].map((item) => item.text).join('')).toBe(line);
    });
  });
});
