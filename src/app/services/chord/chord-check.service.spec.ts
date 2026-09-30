import { TestBed } from '@angular/core/testing';

import { ChordCheckService, ChordIssueReason } from './chord-check.service';

describe('ChordCheckService', () => {
  let service: ChordCheckService;

  const reasons = (chordText: string) =>
    service.findIssues(chordText, '').map(({ token, reason }): [string, ChordIssueReason] => [token, reason]);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChordCheckService);
  });

  it('should accept chords with symbols around them', () => {
    expect(reasons('D b G A D. (D b G A)\nFCd E7 B♭ D/F# Cis')).toEqual([]);
  });

  it('should accept separators, labels and repeat marks', () => {
    expect(reasons('a e › a B7 | E\nПроігрыш: E F# C# A //x2\nB E f# /2р.\nПрыпеў C G')).toEqual([]);
  });

  it('should find Cyrillic letters that look like Latin ones', () => {
    expect(reasons('E B сis\nC а D\nВ c#')).toEqual([['сis', 'cyrillic'], ['а', 'cyrillic'], ['В', 'cyrillic']]);
  });

  it('should find chords missing from the chord list', () => {
    expect(reasons('D E9sus4 A9\ndm7 Bmaj7\nC2/ e G')).toEqual([
      ['E9sus4', 'unknown-chord'],
      ['dm7', 'unknown-chord'],
      ['C2/', 'unknown-chord'],
    ]);
  });

  it('should find fret positions and unknown symbols', () => {
    expect(reasons('D(V) C\nDC(VIII) GB♭\nC (V) G')).toEqual([
      ['D(V)', 'fret-position'],
      ['DC(VIII)', 'fret-position'],
      ['(V)', 'unknown-symbol'],
    ]);
  });

  it('should mention a repeated line once', () => {
    expect(service.findIssues('a4 D\nC\na4 D', '')).toEqual([{ line: 'a4 D', token: 'a4', reason: 'unknown-chord' }]);
  });

  it('should find Cyrillic chord lines that were saved as lyrics', () => {
    const lyrics = 'С9\nАм D\nПрыпеў\nА ты паверыла';

    expect(service.findIssues('', lyrics)).toEqual([
      { line: 'С9', token: 'С9', reason: 'cyrillic' },
      { line: 'Ам D', token: 'Ам', reason: 'cyrillic' },
    ]);
  });
});
