import { chordLineRuns } from './chord-notation';

const sup = (text: string) => ({ text, superscript: true });

describe('chordLineRuns', () => {
  it('should raise the chord type and keep the root on the line', () => {
    expect(chordLineRuns('B7 A7')).toEqual([{ text: 'B' }, sup('7'), { text: ' A' }, sup('7')]);
    expect(chordLineRuns('f#7')).toEqual([{ text: 'f#' }, sup('7')]);
    expect(chordLineRuns('Asus4')).toEqual([{ text: 'A' }, sup('sus4')]);
  });

  it('should print flats as ♭ and German "is" as #', () => {
    expect(chordLineRuns('Bb B♭maj7 eb fis')).toEqual([
      { text: 'B♭ B♭' },
      sup('maj7'),
      { text: ' e♭ f#' },
    ]);
  });

  it('should keep the bass on the line', () => {
    expect(chordLineRuns('D/F# A9/C#')).toEqual([{ text: 'D/F# A' }, sup('9'), { text: '/C#' }]);
  });

  it('should keep what surrounds the chords as typed', () => {
    expect(chordLineRuns('B♭maj7 C (› g7 a7)')).toEqual([
      { text: 'B♭' },
      sup('maj7'),
      { text: ' C (› g' },
      sup('7'),
      { text: ' a' },
      sup('7'),
      { text: ')' },
    ]);
    expect(chordLineRuns('a d G C(C7)')).toEqual([{ text: 'a d G C(C' }, sup('7'), { text: ')' }]);
    expect(chordLineRuns('Ruah e a (x2)')).toEqual([{ text: 'Ruah e a (x2)' }]);
  });

  it('should raise a fret position', () => {
    expect(chordLineRuns('D(V) G')).toEqual([{ text: 'D' }, sup('(V)'), { text: ' G' }]);
  });

  it('should write a minor typed with a Cyrillic letter in Latin', () => {
    expect(chordLineRuns('а d')).toEqual([{ text: 'a d' }]);
  });
});
