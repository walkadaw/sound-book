import { isSimilarText } from './similar-text';

describe('isSimilarText', () => {
  it('treats a lightly edited copy as similar', () => {
    expect(isSimilarText('Ціхая ноч, святая ноч', 'Ціхая ноч, сьвятая ноч!')).toBe(true);
  });

  it('treats unrelated texts as different', () => {
    expect(isSimilarText('Ціхая ноч, святая ноч', 'Хвалі, душа мая, Госпада')).toBe(false);
  });
});
