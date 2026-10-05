import { Service } from '@angular/core';
import { CHORD_KEYS, CHORD_SUFFIXES } from './chord-index';
import { Chord, ChordData, ChordName, Chords } from './chord.interface';
import {
  ALIAS_MAP, ALIAS_SUFFIX, CHORD_CLEAN_UP, ChordNotation, REPLACE_BIMOLE, SHORT_MAP, TO_SHORT_MAP,
} from './chord.model';
import { ChordToken, parseSong } from './song-parser';

export interface ChordList {
  text: string;
  type: 'text' | 'chord';
}

@Service()
export class ChordService {
  private chordData?: Promise<ChordData>;

  hasChord(dirtyChord: string): boolean {
    return !!this.getChord(dirtyChord);
  }

  getChord(dirtyChord: string): ChordName | null {
    const chord = this.convertAlias(this.cleanUpChord(dirtyChord));
    const key = this.getBaseChord(chord) || '';
    const suffixes = CHORD_SUFFIXES[key];

    if (!suffixes || REPLACE_BIMOLE.test(dirtyChord[0])) {
      return null;
    }

    const suffix = this.normalizeSuffix(chord.slice(key.length));

    return suffixes.includes(suffix) ? { key, suffix } : null;
  }

  /** Starts downloading the fingerings ahead of time, so opening a chord doesn't wait for the network */
  preloadChords(): void {
    this.loadChordData();
  }

  async loadChord({ key, suffix }: ChordName): Promise<Chord | undefined> {
    const { chords } = await this.loadChordData();

    return chords[key.replace('#', 'sharp') as keyof Chords]?.find((item) => item.suffix === suffix);
  }

  getChordsList(lins: string[]): ChordList[][] {
    return lins.map((line) => line.split(/[\s]/).reduce<ChordList[]>((acc, text, indexLine, array) => {
      const clear = text.trim().replace(CHORD_CLEAN_UP, '');
      let tmpText = text;
      if (indexLine !== array.length - 1) {
        tmpText += ' ';
      }

      if (clear) {
        const chordList = this.hasChord(clear) ? [clear] : this.findChordInText(clear);
        chordList.forEach((chord) => {
          const index = tmpText.indexOf(chord);

          if (index > 0) {
            acc.push({
              text: tmpText.slice(0, index),
              type: 'text',
            });
          }
          acc.push({
            text: tmpText.slice(index, index + chord.length),
            type: 'chord',
          });

          tmpText = tmpText.slice(index + chord.length);
        });

        if (tmpText.length) {
          acc.push({
            text: tmpText,
            type: 'text',
          });
        }

        return acc;
      }

      acc.push({
        text: tmpText,
        type: 'text',
      });

      return acc;
    }, []));
  }

  /** Splits the editor text into the chord and lyrics lines a song is saved with; chord line N is over lyrics line N */
  getTextAndChord(text: string) {
    let lastIsChord = false;

    return parseSong(text).reduce((acc, line) => {
      if (line.kind === 'chords') {
        // the spaces kept chords over their syllables in the editor; saved rows are not aligned
        acc.chord += `${this.toFullChordLine(line.text, line.chords).trim().split(/\s+/).join(' ')}\n`;
        lastIsChord = true;

        return acc;
      }

      const lyrics = line.kind === 'empty' ? '' : line.text.trim();

      // inline "[Am]lyrics" chords have no columns to keep once saved, so they become a chord line of their own
      if (line.kind === 'lyrics' && line.chords.length) {
        // the chord line above was waiting for this lyrics line, it gets an empty one instead
        if (lastIsChord) {
          acc.text += '\n';
        }

        acc.chord += `${line.chords.map(({ chord }) => this.toFullChord(chord)).join(' ')}\n`;
      } else if (!lastIsChord) {
        acc.chord += '\n';
      }

      acc.text += `${lyrics}\n`;
      lastIsChord = false;

      return acc;
    }, { text: '', chord: '' });
  }

  /** The reverse of getTextAndChord: puts every non-empty chord line back over its lyrics line */
  mergeTextAndChord(song: { text: string; chord: string }): string {
    const text = song.text.split('\n');
    const chord = song.chord.split('\n');
    const item = text.length > chord.length ? text : chord;

    return item
      .map((_, index) => {
        if (chord[index]?.trim()) {
          return `${chord[index]}\n${text[index] ?? ''}`;
        }

        return text[index] ?? '';
      })
      .join('\n');
  }

  getBaseChord(chord: string): string {
    const base = chord.slice(0, 2);

    if (CHORD_KEYS.includes(base)) {
      return base;
    }

    return CHORD_KEYS.find((value) => value === base[0]);
  }

  getShortChord(chord: ChordName): string {
    const suffix = this.getReadableSuffix(chord.suffix);
    let data = chord.key;

    if (suffix[0] === 'm' && suffix.slice(0, 3) !== 'maj') {
      data += 'm';
    }

    if (TO_SHORT_MAP[data]) {
      return TO_SHORT_MAP[data] + suffix.slice(1);
    }

    return `${chord.key}${suffix}`;
  }

  getFullChord(chord: ChordName): string {
    return `${chord.key}${this.getReadableSuffix(chord.suffix)}`;
  }

  convertAlias(chord: string) {
    if (chord.length > 2 && this.normalizeChord(chord.slice(0, 3))) {
      return this.normalizeChord(chord.slice(0, 3)) + chord.slice(3);
    }

    if (chord.length > 1 && this.normalizeChord(chord.slice(0, 2))) {
      return this.normalizeChord(chord.slice(0, 2)) + chord.slice(2);
    }

    if (this.normalizeChord(chord.slice(0, 1))) {
      return this.normalizeChord(chord.slice(0, 1)) + chord.slice(1);
    }

    return chord;
  }

  cleanUpChord(dirtyChord: string): string {
    return this.replaceBimole(dirtyChord).replace(CHORD_CLEAN_UP, '');
  }

  /** Expects a note already normalized by getChord ("D#", not "Eb") */
  transpilationChord(baseChord: string, transpilation: number) {
    // keys go chromatically from C, so the index is the semitone
    const keys = CHORD_KEYS;
    const index = keys.indexOf(baseChord);

    if (index === -1) {
      // this not chord
      return baseChord;
    }

    return keys[(((index + transpilation) % keys.length) + keys.length) % keys.length];
  }

  /** Full notation is the one the song editor saves chords with */
  transposeChord(text: string, transpilation: number, notation: ChordNotation = 'full'): string {
    const chord = this.getChord(text);

    if (chord) {
      const bassIndex = chord.suffix.lastIndexOf('/');
      const bass = chord.suffix.slice(bassIndex + 1);
      const suffix = bassIndex === -1
        ? chord.suffix
        : chord.suffix.slice(0, bassIndex + 1) + this.transpilationChord(bass, transpilation);

      const transposed = { key: this.transpilationChord(chord.key, transpilation), suffix };

      return notation === 'full' ? this.getFullChord(transposed) : this.getShortChord(transposed);
    }

    // slash chord with a bass that is missing from the chord list, e.g. "A/B"
    const slash = text.lastIndexOf('/');

    if (slash > 0) {
      const root = this.transposeChord(text.slice(0, slash), transpilation, notation);
      const bass = this.transposeChord(text.slice(slash + 1), transpilation, notation);

      return `${root}/${bass}`;
    }

    // a chord missing from the chord list, like "Am4", still follows the chosen notation
    return notation === 'short'
      ? text.replace(/^([A-H])(#|b)?m(?!aj)/, (_, root: string, sign = '') => root.toLowerCase() + sign)
      : text;
  }

  getReadableSuffix(suffix: string) {
    if (suffix === 'minor') {
      return 'm';
    }

    if (suffix === 'major') {
      return '';
    }

    return suffix;
  }

  private loadChordData(): Promise<ChordData> {
    // A rejected import is dropped so the next attempt can retry once the network is back.
    this.chordData ??= import('./chord-list').then(
      ({ CHORD_DATA }) => CHORD_DATA,
      (error: unknown): never => {
        this.chordData = undefined;
        throw error;
      },
    );

    return this.chordData;
  }

  /** Rewrites the chords of a chord line in the full notation, keeping everything around them ("(E7)", "|", labels) */
  toFullChordLine(line: string, chords: ChordToken[]): string {
    return [...chords].reverse().reduce(
      (acc, { chord, col }) => acc.slice(0, col) + this.toFullChord(chord) + acc.slice(col + chord.length),
      line,
    );
  }

  /** "a" → "Am", "D/f#" → "D/F#"; a chord missing from the chord list only gets its root rewritten */
  toFullChord(text: string): string {
    const chord = this.getChord(text);

    if (chord) {
      return this.getFullChord(chord);
    }

    const slash = text.lastIndexOf('/');

    if (slash > 0) {
      // in the short notation the bass is a note, so "D/f#" is D over F#, not over F#m
      const bass = text.slice(slash + 1);
      const note = this.convertAlias(this.replaceBimole(bass[0].toUpperCase() + bass.slice(1)));

      return `${this.toFullChord(text.slice(0, slash))}/${note}`;
    }

    return this.convertAlias(this.replaceBimole(text));
  }

  private replaceBimole(chord: string): string {
    return chord.replace(REPLACE_BIMOLE, 'b');
  }

  /**
   * Splits glued chords ("AmDm", "CGD") into a list. Returns an empty list unless the whole
   * word is made of chords, so lyrics like "Adonai" are never partially recognized.
   */
  private findChordInText(origin: string): string[] {
    return this.splitChords(origin) ?? [];
  }

  /** Chord with an arbitrary bass note, e.g. "A/B", that is missing from the chord list suffixes */
  private isSlashChord(candidate: string): boolean {
    const slash = candidate.lastIndexOf('/');

    return slash > 0 && this.hasChord(candidate.slice(0, slash)) && this.hasChord(candidate.slice(slash + 1));
  }

  private splitChords(origin: string): string[] | null {
    if (!origin) {
      return [];
    }

    for (let end = origin.length; end > 0; end--) {
      const candidate = origin.slice(0, end);

      if (this.hasChord(candidate) || this.isSlashChord(candidate)) {
        const rest = this.splitChords(origin.slice(end));

        if (rest) {
          return [candidate, ...rest];
        }
      }
    }

    return null;
  }

  private normalizeChord(baseChord: string): string {
    let result: string;
    // German sharp notation is also written capitalized: "Cis"
    const shortKey = baseChord.length === 3 && baseChord.endsWith('is') ? baseChord.toLowerCase() : baseChord;

    if (SHORT_MAP[shortKey]) {
      result = SHORT_MAP[shortKey];
    }

    if (ALIAS_MAP[result || baseChord]) {
      result = ALIAS_MAP[result || baseChord];
    }

    return result;
  }

  private normalizeSuffix(suffix: string) {
    if (!suffix) {
      return 'major';
    }

    if (ALIAS_SUFFIX[suffix]) {
      return ALIAS_SUFFIX[suffix];
    }

    return suffix;
  }
}
