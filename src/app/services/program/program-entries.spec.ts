import { entryEnd, insertionIndex, isEntryBoundary, moveEntry } from './program-entries';

interface TestSong {
  id: string;
  liturgy: string | null;
  startIndex: number;
  endIndex: number;
}

// one slide a song
const program = (...ids: string[]): TestSong[] =>
  ids.map((name, index) => {
    const [id, liturgy = null] = name.split('@');

    return { id, liturgy, startIndex: index, endIndex: index };
  });

const ids = (list: TestSong[] | null) => list?.map(({ id }) => id).join(' ') ?? null;

describe('program entries', () => {
  // A, then a mass of two parts, then B
  const list = program('A', 'r@l', 'g@l', 'B');

  it('should take the parts of a mass as one entry', () => {
    expect(entryEnd(list, 0)).toBe(1);
    expect(entryEnd(list, 1)).toBe(3);
  });

  it('should not let a song stand inside a mass', () => {
    expect([0, 1, 2, 3, 4].map((index) => isEntryBoundary(list, index))).toEqual([true, true, false, true, true]);
  });

  it('should move a song down and up', () => {
    expect(ids(moveEntry(list, 0, 4))).toBe('r g B A');
    expect(ids(moveEntry(list, 3, 0))).toBe('B A r g');
  });

  it('should move a mass as a whole', () => {
    expect(ids(moveEntry(list, 1, 0))).toBe('r g A B');
    expect(ids(moveEntry(list, 1, 4))).toBe('A B r g');
  });

  it('should refuse a move that changes nothing or splits a mass', () => {
    expect(moveEntry(list, 0, 0)).toBeNull();
    expect(moveEntry(list, 0, 1)).toBeNull();
    expect(moveEntry(list, 0, 2)).toBeNull();
    expect(moveEntry(list, 2, 0)).toBeNull();
  });

  it('should show next right after the current song, or after the whole current mass', () => {
    expect(insertionIndex(list, 0)).toBe(1);
    expect(insertionIndex(list, 1)).toBe(3);
    expect(insertionIndex([], 0)).toBe(0);
  });
});
