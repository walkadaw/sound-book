import { parseDirective, sectionLabel } from './song-parser';

export type StanzaKind = 'verse' | 'chorus' | 'bridge' | 'plain';

export interface StanzaLine {
  text: string;
  /** The chord row of the same index, empty when the line has no chords */
  chords: string;
}

export interface Stanza {
  kind: StanzaKind;
  /** Verse number as written in the text */
  number?: string;
  lines: StanzaLine[];
}

export type StructureIssue =
  | { kind: 'label-without-stanza'; text: string }
  | { kind: 'chords-on-hidden-line'; text: string; chords: string }
  | { kind: 'chords-without-lyrics'; chords: string }
  | { kind: 'unknown-directive'; text: string }
  | { kind: 'verse-numbering'; numbers: string[] };

export interface SongStructure {
  stanzas: Stanza[];
  issues: StructureIssue[];
}

export interface DisplayRow {
  text: string;
  chords: string;
  /** "gap" is the empty line between stanzas */
  kind: StanzaKind | 'gap';
}

const VERSE = /^(\d+)\.\s*/;
const CHORUS_LABELS = /^(?:припев|прыпеў|приспів|рэфрэн|refrain|chorus)$/;
const PLAIN_LABELS = /^(?:куплет|запев|verse)$/;
// "(х2)" with a Cyrillic "х", "(2x)", "(×2)" all mean the same repeat
const REPEAT = /\s*\(\s*(?:[xхXХ×]\s*(\d+)|(\d+)\s*[xхXХ×])\s*\)/g;
const ODD_SPACES = /[\u00a0\u2000-\u200a\u202f]/g;

export function normalizeLyrics(line: string): string {
  return line
    .replace(ODD_SPACES, ' ')
    .replace(REPEAT, (_match, after: string | undefined, before: string | undefined) => ` (x${after ?? before})`)
    .trim();
}

/** A row of only dots or dashes keeps an empty chord row in place */
function normalizeChordRow(row: string): string {
  const chords = row.replace(ODD_SPACES, ' ').trim();
  return /^[^\p{L}\d]*$/u.test(chords) ? '' : chords;
}

function labelKind(label: string): StanzaKind {
  if (CHORUS_LABELS.test(label)) {
    return 'chorus';
  }

  return PLAIN_LABELS.test(label) ? 'plain' : 'bridge';
}

/**
 * Splits a stored song into stanzas: they are separated by an empty line or start with a verse number,
 * and a label line ("Прыпеў:", "Брыдж:") gives the next stanza its kind.
 * Label lines are not lyrics, so they and their chord rows are left out; so are "{name: value}" lines,
 * which no longer mean anything and are reported.
 */
export function songStructure(song: { text: string; chord?: string | null }): SongStructure {
  const texts = song.text.split(/\r?\n/);
  const chordRows = (song.chord ?? '').split(/\r?\n/);
  const stanzas: Stanza[] = [];
  const issues: StructureIssue[] = [];
  let current: Stanza | null = null;
  let label: { kind: StanzaKind; text: string } | null = null;
  // chords over an empty line belong to whatever comes next
  let waitingChords: StanzaLine[] = [];

  for (let index = 0; index < Math.max(texts.length, chordRows.length); index++) {
    const text = normalizeLyrics(texts[index] ?? '');
    const chords = normalizeChordRow(chordRows[index] ?? '');
    const directive = parseDirective(text);
    const labelWord = directive ? null : sectionLabel(text);

    if (directive || labelWord) {
      if (chords) {
        issues.push({ kind: 'chords-on-hidden-line', text, chords });
        waitingChords.push({ text: '', chords });
      }

      if (directive) {
        issues.push({ kind: 'unknown-directive', text });
      } else if (labelWord) {
        if (label) {
          issues.push({ kind: 'label-without-stanza', text: label.text });
        }
        current = null;
        label = { kind: labelKind(labelWord), text };
      }

      continue;
    }

    if (!text) {
      if (chords && index >= texts.length && stanzas.length) {
        stanzas[stanzas.length - 1].lines.push({ text: '', chords });
        issues.push({ kind: 'chords-without-lyrics', chords });
      } else if (chords) {
        current = null;
        waitingChords.push({ text: '', chords });
        issues.push({ kind: 'chords-without-lyrics', chords });
      } else {
        current = null;
      }

      continue;
    }

    const verse = VERSE.exec(text);

    if (verse || !current) {
      current = {
        kind: label?.kind ?? (verse ? 'verse' : 'plain'),
        ...(verse ? { number: verse[1] } : {}),
        lines: waitingChords,
      };
      stanzas.push(current);
      label = null;
      waitingChords = [];
    }

    current.lines.push({ text: verse ? text.slice(verse[0].length) : text, chords });
  }

  if (label) {
    issues.push({ kind: 'label-without-stanza', text: label.text });
  }

  if (waitingChords.length && stanzas.length) {
    stanzas[stanzas.length - 1].lines.push(...waitingChords);
  }

  const numbers = stanzas.flatMap((stanza) => (stanza.number ? [stanza.number] : []));

  if (numbers.some((number, index) => Number(number) !== index + 1)) {
    issues.push({ kind: 'verse-numbering', numbers });
  }

  return { stanzas, issues };
}

/** The song text without its label and directive lines, for places that show lyrics only */
export function withoutMarks(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return !parseDirective(trimmed) && !sectionLabel(trimmed);
    })
    .join('\n');
}

/** Lines as the site shows them: one empty line between stanzas, the verse number back in front of the first words */
export function displayRows({ stanzas }: SongStructure): DisplayRow[] {
  return stanzas.flatMap((stanza, stanzaIndex) => {
    const numbered = Math.max(0, stanza.lines.findIndex(({ text }) => text));

    return [
      ...(stanzaIndex ? [{ text: '', chords: '', kind: 'gap' as const }] : []),
      ...stanza.lines.map((line, lineIndex) => ({
        text: lineIndex === numbered && stanza.number ? `${stanza.number}. ${line.text}` : line.text,
        chords: line.chords,
        kind: stanza.kind,
      })),
    ];
  });
}
