import { tokenizeLine } from '../chord/song-parser';

export interface ChordRun {
  text: string;
  superscript?: boolean;
}

const CHORD_PARTS = /^([A-Ha-h])(#|♯|b|♭|is)?(.*?)(?:\/([A-Ha-h])(#|♯|b|♭|is)?(m?))?$/;
const FRET = /\([IVX]+\)/g;

function accidental(sign: string | undefined): string {
  if (!sign) {
    return '';
  }

  return sign === 'b' || sign === '♭' ? '♭' : '#';
}

/**
 * "B♭maj7/D": the root and the bass stay on the line, the chord type is raised as in the paper songbook.
 * Songs are stored in the full notation, the paper songbook prints the short one: "Am7" is "a" with a raised "7".
 */
function chordRuns(chord: string): ChordRun[] {
  const parts = CHORD_PARTS.exec(chord);

  if (!parts) {
    return [{ text: chord }];
  }

  const [, root, rootSign, suffix, bass, bassSign, bassMinor] = parts;
  const minor = /^m(?!aj)/.test(suffix);
  const raised = minor ? suffix.slice(1) : suffix;

  return [
    { text: `${minor ? root.toLowerCase() : root}${accidental(rootSign)}` },
    ...(raised ? [{ text: raised, superscript: true }] : []),
    ...(bass ? [{ text: `/${bass}${accidental(bassSign)}${bassMinor}` }] : []),
  ];
}

function plainRuns(text: string): ChordRun[] {
  const runs: ChordRun[] = [];
  let from = 0;

  for (const fret of text.matchAll(FRET)) {
    runs.push({ text: text.slice(from, fret.index) }, { text: fret[0], superscript: true });
    from = fret.index + fret[0].length;
  }

  runs.push({ text: text.slice(from) });
  return runs;
}

/**
 * A chord row as printed: chords are written the way the paper songbook does,
 * everything around them (bars, brackets, "›", repeats) stays as typed.
 */
export function chordLineRuns(line: string): ChordRun[] {
  const runs: ChordRun[] = [];
  let from = 0;

  for (const token of tokenizeLine(line)) {
    if (token.type !== 'chord') {
      continue;
    }

    for (const { chord, col } of token.chords) {
      runs.push(...plainRuns(line.slice(from, col)), ...chordRuns(chord));
      from = col + chord.length;
    }
  }

  runs.push(...plainRuns(line.slice(from)));

  return runs
    .filter(({ text }) => text)
    .reduce<ChordRun[]>((merged, run) => {
      const last = merged[merged.length - 1];

      if (last && !last.superscript === !run.superscript) {
        last.text += run.text;
      } else {
        merged.push({ ...run });
      }

      return merged;
    }, []);
}
