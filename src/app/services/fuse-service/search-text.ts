import { FuseResultMatch } from 'fuse.js';

const REPLACE_SIMILAR_CHAR: { [key: string]: string } = {
  і: 'и',
  ў: 'у',
  ё: 'е',
};
const REPLACE_SIMILAR_CHAR_REGEXP = new RegExp(`[${Object.keys(REPLACE_SIMILAR_CHAR).join('')}]`, 'gi');
const SNIPPET_LENGTH = 60;

export interface MatchSnippet {
  before: string;
  match: string;
  after: string;
}

/** Replaces similar letters one-to-one, so indexes in the result match indexes in the source. */
export function replaceSimilarChars(str: string): string {
  return str.replace(REPLACE_SIMILAR_CHAR_REGEXP, (char) => REPLACE_SIMILAR_CHAR[char.toLowerCase()]);
}

/** Builds a snippet of a fixed length that contains the longest match Fuse found in the given key of the text. */
export function getMatchSnippet(
  matches: readonly FuseResultMatch[] | undefined,
  key: string,
  text: string,
): MatchSnippet | null {
  const indices = matches?.find((match) => match.key === key)?.indices ?? [];
  const longest = indices.reduce<readonly [number, number] | null>(
    (best, range) => (!best || range[1] - range[0] > best[1] - best[0] ? range : best),
    null,
  );

  if (!longest) {
    return null;
  }

  const { plain, positions } = collapseWhitespace(text);
  const matchStart = positions[longest[0]];
  const matchEnd = Math.min(positions[longest[1]] + 1, matchStart + SNIPPET_LENGTH);
  const windowStart = Math.min(
    Math.max(0, matchStart - Math.floor((SNIPPET_LENGTH - (matchEnd - matchStart)) / 2)),
    Math.max(0, plain.length - SNIPPET_LENGTH),
  );
  const windowEnd = Math.min(plain.length, windowStart + SNIPPET_LENGTH);

  return {
    before: (windowStart > 0 ? '…' : '') + plain.slice(windowStart, matchStart),
    match: plain.slice(matchStart, matchEnd),
    after: plain.slice(matchEnd, windowEnd) + (windowEnd < plain.length ? '…' : ''),
  };
}

/** Collapses whitespace runs into a single space and maps each index of the source to its index in the result. */
function collapseWhitespace(text: string): { plain: string; positions: number[] } {
  const positions: number[] = [];
  let plain = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isSpace = /\s/.test(char);
    if (!isSpace || !plain.endsWith(' ')) {
      plain += isSpace ? ' ' : char;
    }
    positions.push(plain.length - 1);
  }

  return { plain, positions };
}
