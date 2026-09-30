export interface ChordToken {
  /** Chord as written, with Cyrillic look-alike letters replaced and surrounding punctuation removed */
  chord: string;
  /** Column in the line text; for inline chords, in the text without the brackets */
  col: number;
}

export type SongLine =
  | { kind: 'empty' }
  | { kind: 'label'; text: string }
  | { kind: 'chords'; text: string; label?: string; chords: ChordToken[] }
  | { kind: 'lyrics'; text: string; chords: ChordToken[] };

/**
 * weak: a chord that is also a common word ("a", "e", Cyrillic "А", "с");
 * wordlike: lowercase note letters glued together, which are more often a word ("bad", "face") than chords
 */
type Strength = 'strong' | 'weak' | 'wordlike';

interface Token {
  text: string;
  col: number;
}

type TokenClass =
  | { type: 'neutral' }
  | { type: 'word' }
  | { type: 'chord'; strength: Strength; chords: ChordToken[] };

type ChordLine = Extract<SongLine, { kind: 'chords' }>;

type Candidate =
  | SongLine
  | (Omit<ChordLine, 'kind'> & { kind: 'weak-chords'; wordlike: boolean; spaced: boolean });

const ACCIDENTAL = '(?:#|b|♯|♭|is)';
const QUALITY = '(?:maj|min|m|M|dim|aug|°|ø|\\+)?';
const EXTENSION = '(?:(?:maj|add)?(?:2|4|5|6|7|9|11|13|69))?';
const ALTERATION = '(?:sus[24]?|add(?:2|4|9|11|13)|alt|[#b♯♭+\\-](?:5|9|11|13)'
  + '|\\((?:[#b♯♭+\\-]?(?:2|4|5|6|7|9|11|13),?\\s?)+\\))*';
// songbooks write the bass as a minor chord too: "C/Em"
const BASS = `(?:/[A-Ha-h]${ACCIDENTAL}?m?)?`;
// A lowercase root already means minor ("a" = Am), so it takes no quality: "am" is not a chord
const CHORD = new RegExp(
  `^(?:[A-H]${ACCIDENTAL}?${QUALITY}|[a-h]${ACCIDENTAL}?)${EXTENSION}${ALTERATION}${BASS}$`,
);

const NEUTRAL = new RegExp([
  '\\|+:?', ':?\\|+', '[-–—~/%.…*:()]+',
  '\\(?[xх×*]\\s?\\d+\\)?', '\\(?\\d+\\s?[xх×]\\)?', '\\(?\\d+\\.?\\)?', '\\d+р\\.?',
  'раза?\\.?\\)?', 'N\\.?C\\.?',
  // capo or fret position: "(V)"; a bare "I" would be the English word
  '\\([IVX]+\\)',
].map((pattern) => `(?:${pattern})`).join('|').replace(/^/, '^(?:').replace(/$/, ')$'), 'iu');
const FRET = /^[IVX]+$/;

const SECTION_LABEL = new RegExp(
  '^\\s*(?:\\d+\\.?\\s*)?(?:припев|прыпеў|приспів|куплет|запев|вступление|вступ|уступ|проигрыш|проігрыш|прайгрыш'
  + '|кода|концовка|окончание|бридж|мост|соло'
  + '|intro|verse|chorus|pre-?chorus|bridge|interlude|instrumental|solo|outro|coda)'
  + '(?:\\s*\\d+)?\\s*([.:])?\\s*',
  'iu',
);

const HOMOGLYPHS: Record<string, string> = {
  А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', а: 'a', с: 'c', е: 'e', м: 'm', і: 'i',
};
const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[A-Za-z]/;

// "›" marks a transition between chords and is glued to them: "E›B7›c#"
const TOKEN = /[^\s›→]+/g;
// round brackets are left to splitAlternatives, which tells "(E7)" from "D7(b9)"
const WRAP_START = /^[[{«"'.,;:!?*]+/;
const WRAP_END = /[\]}».,;:!?*"'/]+$/;
const INLINE_CHORD = /\[([^\]\s]+)\]/g;

/**
 * Splits free-form song text into chord and lyrics lines.
 * A line is either all chords or lyrics: words that happen to look like chords ("А", "Do", "a")
 * never become chords inside a lyrics line.
 */
export function parseSong(text: string): SongLine[] {
  const candidates = text.split(/\r?\n/).map(classifyLine);
  const confident = candidates.filter((line): line is ChordLine => line.kind === 'chords');
  const shortNotation = confident.some((line) => line.chords.some(({ chord }) => /^[a-h]/.test(chord)));

  return candidates.map((line, index) => {
    if (line.kind !== 'weak-chords') {
      return line;
    }

    const { spaced, wordlike, ...chordLine } = line;
    const prev = candidates[index - 1]?.kind;
    const next = candidates[index + 1]?.kind;
    // a lone "a" or "e b" over a lyrics line is a chord line, in whatever notation the song is written
    const placedLikeChords = spaced || next === 'lyrics' || prev === 'chords' || next === 'chords';
    const isChords = confident.length > 0 && placedLikeChords && (!wordlike || shortNotation);

    return isChords ? { ...chordLine, kind: 'chords' } : { kind: 'lyrics', text: line.text, chords: [] };
  });
}

export type LineToken = Token & (
  | { type: 'neutral' | 'word' }
  | { type: 'chord'; chords: ChordToken[] }
);

/**
 * Every whitespace-separated token of a line as the parser sees it, without looking at the rest of the song.
 * A leading "Label:" is left out, the same way a labelled chord line is read.
 */
export function tokenizeLine(line: string): LineToken[] {
  const label = SECTION_LABEL.exec(line);
  const from = label?.[1] ? label[0].length : 0;

  return tokenize(line, from).map((token) => {
    const classified = classifyToken(token);

    return classified.type === 'chord'
      ? { ...token, type: 'chord', chords: classified.chords }
      : { ...token, type: classified.type };
  });
}

/** Same grammar the line classifier uses, for a single already-extracted chord */
export function isChord(text: string): boolean {
  return CHORD.test(text);
}

function classifyLine(line: string): Candidate {
  if (!line.trim()) {
    return { kind: 'empty' };
  }

  const inline = parseInlineChords(line);

  if (inline) {
    return inline;
  }

  const label = SECTION_LABEL.exec(line);

  if (label) {
    const rest = line.slice(label[0].length);

    if (!rest.trim()) {
      return { kind: 'label', text: line };
    }

    // "Мост через реку" is lyrics; only "Label:" followed by chords is a labelled chord line
    const chordLine = label[1] ? classifyTokens(line, label[0].length) : null;

    if (chordLine) {
      return { ...chordLine, label: label[0].trim() };
    }
  }

  return classifyTokens(line, 0) ?? { kind: 'lyrics', text: line, chords: [] };
}

function classifyTokens(line: string, from: number): Extract<Candidate, { kind: 'chords' | 'weak-chords' }> | null {
  const tokens = tokenize(line, from).map(classifyToken);

  if (tokens.some((token) => token.type === 'word')) {
    return null;
  }

  const chordTokens = tokens.filter((token): token is Extract<TokenClass, { type: 'chord' }> => token.type === 'chord');

  if (!chordTokens.length) {
    // songbooks keep "." or ".." as an empty chord row over a lyrics line; "x2" alone is lyrics
    return /^[^\p{L}\d]+$/u.test(line.slice(from))
      ? { kind: 'weak-chords', text: line, chords: [], wordlike: false, spaced: false }
      : null;
  }

  const chords = chordTokens.flatMap((token) => token.chords);

  if (chordTokens.some((token) => token.strength === 'strong')) {
    return { kind: 'chords', text: line, chords };
  }

  return {
    kind: 'weak-chords',
    text: line,
    chords,
    wordlike: chordTokens.some((token) => token.strength === 'wordlike'),
    spaced: /^\s{2,}\S|\S\s{2,}\S/.test(line.slice(from)),
  };
}

function tokenize(line: string, from: number): Token[] {
  return [...line.slice(from).matchAll(TOKEN)].map((match) => ({ text: match[0], col: from + match.index }));
}

function classifyToken({ text, col }: Token): TokenClass {
  // repeats are also written after slashes: "//x2", "/2р."
  if (NEUTRAL.test(text) || NEUTRAL.test(text.replace(/^\/+/, ''))) {
    return { type: 'neutral' };
  }

  const start = WRAP_START.exec(text)?.[0].length ?? 0;
  const core = text.slice(start).replace(WRAP_END, '');
  const latin = toLatin(core);
  const chords = latin ? splitAlternatives(latin, col + start) : null;

  if (!latin || !chords?.length) {
    return { type: 'word' };
  }

  return { type: 'chord', strength: tokenStrength(core, latin, chords.length), chords };
}

/**
 * Tokens that are also common words are weak: a lone "a"/"c"/"e" in the short notation
 * and all-Cyrillic "А", "С", "Е". Glued letters in word case ("dead", "Cafe") are wordlike.
 * A glued token with an inner capital ("DGeaDGDG") or any digit/#/slash is a chord for sure.
 */
function tokenStrength(core: string, latin: string, pieces: number): Strength {
  // "С9" or "Аm" can't be a word, a bare "А" or "Ем" can
  if (CYRILLIC.test(core)) {
    return LATIN.test(core) || /[\d#/]/.test(core) ? 'strong' : 'weak';
  }

  if (/.[A-H]|[\d#/♯♭()]/.test(latin)) {
    return 'strong';
  }

  if (/^[a-z]+$/.test(latin)) {
    return pieces > 1 ? 'wordlike' : 'weak';
  }

  // a capitalized word at the start of a sentence: "Ah" = A+h, "Bad" = B+a+d
  return pieces > 1 && /^[A-H][a-z]+$/.test(latin) ? 'wordlike' : 'strong';
}

/** Returns null when the token has Cyrillic letters that cannot be a mistyped chord */
function toLatin(core: string): string | null {
  let result = '';

  for (const char of core) {
    if (CYRILLIC.test(char)) {
      if (!HOMOGLYPHS[char]) {
        return null;
      }
      result += HOMOGLYPHS[char];
    } else {
      result += char;
    }
  }

  return result || null;
}

/**
 * Chords, possibly glued, with alternatives or a fret in brackets: "D(A)", "Ca(FG)(ea)", "D(V)".
 * Brackets that belong to the chord itself ("D7(b9)") are kept by trying the whole token first.
 */
function splitAlternatives(text: string, col: number): ChordToken[] | null {
  const whole = splitChords(text);

  if (whole) {
    return toTokens(whole, col);
  }

  const result: ChordToken[] = [];

  for (const match of text.matchAll(/[^()]+/g)) {
    if (FRET.test(match[0])) {
      continue;
    }

    const pieces = splitChords(match[0]);

    if (!pieces) {
      return null;
    }

    result.push(...toTokens(pieces, col + match.index));
  }

  return result;
}

function toTokens(pieces: string[], col: number): ChordToken[] {
  let offset = col;

  return pieces.map((chord) => {
    const token = { chord, col: offset };
    offset += chord.length;
    return token;
  });
}

/** Splits glued chords ("AmDm") preferring the longest chord first; null unless the whole text is chords */
function splitChords(text: string): string[] | null {
  if (!text) {
    return [];
  }

  for (let end = text.length; end > 0; end--) {
    const candidate = text.slice(0, end);

    if (CHORD.test(candidate)) {
      const rest = splitChords(text.slice(end));

      if (rest) {
        return [candidate, ...rest];
      }
    }
  }

  return null;
}

function parseInlineChords(line: string): SongLine | null {
  const matches = [...line.matchAll(INLINE_CHORD)];
  const names = matches.map((match) => toLatin(match[1]));

  if (!matches.length || !names.every((name) => name && CHORD.test(name))) {
    return null;
  }

  let removed = 0;
  const chords = matches.map((match, index) => {
    const token = { chord: names[index] as string, col: match.index - removed };
    removed += match[0].length;
    return token;
  });
  const text = line.replace(INLINE_CHORD, '');

  // "[Am] [G]" alone is a plain chord line written with brackets
  return text.trim() ? { kind: 'lyrics', text, chords } : null;
}
