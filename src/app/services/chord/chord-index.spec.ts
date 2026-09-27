import { CHORD_DATA } from './chord-list';
import { CHORD_KEYS, CHORD_MAIN, CHORD_SUFFIXES, CHORD_TUNINGS } from './chord-index';

describe('chord index', () => {
  it('matches the chord list it was generated from', () => {
    const suffixesByKey: Record<string, string[]> = {};

    for (const chords of Object.values(CHORD_DATA.chords)) {
      for (const chord of chords) {
        (suffixesByKey[chord.key] ??= []).push(chord.suffix);
      }
    }

    expect(CHORD_SUFFIXES).toEqual(suffixesByKey);
    expect(CHORD_KEYS).toEqual(CHORD_DATA.keys);
    expect(CHORD_MAIN).toEqual(CHORD_DATA.main);
    expect(CHORD_TUNINGS).toEqual(CHORD_DATA.tunings);
  });
});
