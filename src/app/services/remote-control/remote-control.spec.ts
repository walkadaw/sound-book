import { SlideList } from '../../interfaces/slide';
import { insertionIndex, remoteSongs } from './remote-control';

const song = (title: string, startIndex: number, endIndex: number, liturgy?: string): SlideList => ({
  id: title,
  title,
  slides: Array.from({ length: endIndex - startIndex + 1 }, () => ({ fontSize: 58, text: title })),
  startIndex,
  endIndex,
  liturgy,
});

describe('remote control protocol', () => {
  it('should pair the lyrics with their chords for the notes', () => {
    const [state] = remoteSongs([{ ...song('Песня', 0, 0), text: 'Радок\n\nДругі', chord: 'Am C\n\nG' }]);

    expect(state.notes).toEqual([
      { chords: 'Am C', text: 'Радок' },
      { chords: '', text: '' },
      { chords: 'G', text: 'Другі' },
    ]);
    expect(state.liturgy).toBeNull();
    expect(state.slides).toEqual([{ fontSize: 58, text: 'Песня' }]);
  });

  it('should leave the notes of a mass empty', () => {
    expect(remoteSongs([song('ЧЫТАННЕ', 0, 1, 'l')])[0].notes).toEqual([]);
  });

  it('should insert right after the current song', () => {
    const list = [song('A', 0, 1), song('B', 2, 2), song('C', 3, 4)];

    expect(insertionIndex(list, 1)).toBe(1);
    expect(insertionIndex(list, 4)).toBe(3);
  });

  it('should insert after the whole mass the current part belongs to', () => {
    const list = [song('A', 0, 0), song('Ч', 1, 1, 'l'), song('Е', 2, 3, 'l'), song('B', 4, 4)];

    expect(insertionIndex(list, 1)).toBe(3);
  });

  it('should insert at the end of an empty presentation', () => {
    expect(insertionIndex([], 0)).toBe(0);
  });
});
