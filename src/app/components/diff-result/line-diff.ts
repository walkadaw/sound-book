import { diffArrays, diffWords } from 'diff';

export type DiffLineKind = 'same' | 'removed' | 'added';

export interface DiffPart {
  text: string;
  /** a word that differs inside a line that was edited, not replaced as a whole */
  changed: boolean;
}

export interface DiffLine {
  kind: DiffLineKind;
  parts: DiffPart[];
  /** has no text to highlight, so a removed or added blank line needs a mark of its own */
  empty: boolean;
}

export type DiffBlock = { kind: 'lines'; lines: DiffLine[] } | { kind: 'collapsed'; lines: DiffLine[] };

export interface LineDiff {
  blocks: DiffBlock[];
  added: number;
  removed: number;
}

// Shorter runs of unchanged lines stay visible: a button would take as much room as the lines themselves.
const MIN_COLLAPSED = 3;

// diffWords' own tokenizer only knows Latin letters and would split Cyrillic words into single letters.
const WORDS = new Intl.Segmenter('be', { granularity: 'word' });

/**
 * Compares two texts line by line, like a unified diff: removed lines go before the added ones that replace them,
 * and a removed line paired with an added one gets the differing words marked inside it.
 * Unchanged lines further than `context` lines from any change are collapsed.
 */
export function buildLineDiff(before: string, after: string, context = 2): LineDiff {
  const lines: DiffLine[] = [];
  const changes = diffArrays(toLines(before), toLines(after));

  for (let index = 0; index < changes.length; index++) {
    const change = changes[index];

    if (!change.added && !change.removed) {
      lines.push(...change.value.map((text) => wholeLine('same', text)));
      continue;
    }

    if (change.added) {
      lines.push(...pairLines([], change.value));
      continue;
    }

    const next = changes[index + 1];

    if (next?.added) {
      lines.push(...pairLines(change.value, next.value));
      index++;
    } else {
      lines.push(...pairLines(change.value, []));
    }
  }

  return {
    blocks: collapse(lines, context),
    added: lines.filter(({ kind }) => kind === 'added').length,
    removed: lines.filter(({ kind }) => kind === 'removed').length,
  };
}

// Songs saved before the editor normalised line endings still have \r\n; that alone must not count as a change.
function toLines(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').trimEnd();

  return normalized ? normalized.split('\n') : [];
}

function wholeLine(kind: DiffLineKind, text: string): DiffLine {
  return line(kind, [{ text, changed: false }]);
}

function line(kind: DiffLineKind, parts: DiffPart[]): DiffLine {
  return { kind, parts, empty: parts.every(({ text }) => !text) };
}

function pairLines(removed: string[], added: string[]): DiffLine[] {
  const removedLines: DiffLine[] = [];
  const addedLines: DiffLine[] = [];

  removed.forEach((text, index) => {
    if (index >= added.length) {
      removedLines.push(wholeLine('removed', text));
      return;
    }

    const words = diffWords(text, added[index], { intlSegmenter: WORDS });

    removedLines.push(
      line(
        'removed',
        words.filter((word) => !word.added).map((word) => ({ text: word.value, changed: word.removed })),
      ),
    );
    addedLines.push(
      line(
        'added',
        words.filter((word) => !word.removed).map((word) => ({ text: word.value, changed: word.added })),
      ),
    );
  });

  addedLines.push(...added.slice(removed.length).map((text) => wholeLine('added', text)));

  return [...removedLines, ...addedLines];
}

function collapse(lines: DiffLine[], context: number): DiffBlock[] {
  const visible = lines.map((_, index) =>
    lines.slice(Math.max(0, index - context), index + context + 1).some(({ kind }) => kind !== 'same'),
  );
  const blocks: DiffBlock[] = [];
  let start = 0;

  while (start < lines.length) {
    let end = start;

    while (end < lines.length && visible[end] === visible[start]) {
      end++;
    }

    const run = lines.slice(start, end);
    const kind = !visible[start] && run.length >= MIN_COLLAPSED ? 'collapsed' : 'lines';
    const last = blocks.at(-1);

    if (kind === 'lines' && last?.kind === 'lines') {
      last.lines.push(...run);
    } else {
      blocks.push({ kind, lines: run });
    }

    start = end;
  }

  return blocks;
}
