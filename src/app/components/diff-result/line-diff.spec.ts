import { DiffBlock, buildLineDiff } from './line-diff';

const render = (blocks: DiffBlock[]) =>
  blocks.flatMap((block) =>
    block.kind === 'collapsed'
      ? [`… ${block.lines.length}`]
      : block.lines.map(({ kind, parts }) => {
          const sign = { same: ' ', removed: '-', added: '+' }[kind];

          return sign + parts.map(({ text, changed }) => (changed ? `[${text}]` : text)).join('');
        }),
  );

describe('buildLineDiff', () => {
  it('should mark the changed words of an edited line', () => {
    const { blocks, added, removed } = buildLineDiff('Снова вечер\nИ опять', 'Снова утро\nИ опять');

    expect(render(blocks)).toEqual(['-Снова [вечер]', '+Снова [утро]', ' И опять']);
    expect([added, removed]).toEqual([1, 1]);
  });

  it('should show removed and added blank lines', () => {
    expect(render(buildLineDiff('a\n\nb', 'a\nb').blocks)).toEqual([' a', '-', ' b']);
    expect(render(buildLineDiff('a\nb', 'a\n\nb').blocks)).toEqual([' a', '+', ' b']);
  });

  it('should list the removed lines before the added ones that replace them', () => {
    expect(render(buildLineDiff('a\nb', 'c\nd\ne').blocks)).toEqual(['-[a]', '-[b]', '+[c]', '+[d]', '+e']);
  });

  it('should collapse unchanged lines far from any change', () => {
    const before = ['1', '2', '3', '4', '5', '6', '7', '8'].join('\n');
    const after = before.replace('8', 'eight');

    expect(render(buildLineDiff(before, after, 2).blocks)).toEqual(['… 5', ' 6', ' 7', '-[8]', '+[eight]']);
  });

  it('should keep short unchanged runs visible', () => {
    const before = ['1', '2', '3', '4', '5'].join('\n');

    expect(render(buildLineDiff(before, before.replace('5', 'five'), 2).blocks)).toEqual([
      ' 1',
      ' 2',
      ' 3',
      ' 4',
      '-[5]',
      '+[five]',
    ]);
  });

  it('should not count line endings and trailing blank lines as changes', () => {
    const { added, removed } = buildLineDiff('a\r\nb\r\n\r\n', 'a\nb');

    expect([added, removed]).toEqual([0, 0]);
  });
});
