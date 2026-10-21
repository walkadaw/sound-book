import { liturgyId, liturgyIndex } from './liturgy';

describe('liturgy ids', () => {
  it('should name the default mass "l" and the others by their number', () => {
    expect([0, 1, 2].map(liturgyId)).toEqual(['l', 'l2', 'l3']);
    expect(['l', 'l2', 'l3'].map(liturgyIndex)).toEqual([0, 1, 2]);
  });

  it('should not take songs and other ids for masses', () => {
    expect(['12', 'l1', 'l0', 'l02', 'lx', 'r1', ''].map(liturgyIndex)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(liturgyIndex('l10')).toBe(9);
  });
});
