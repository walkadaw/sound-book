import { Service } from '@angular/core';
import { CHORD_DATA } from './chord-list';
import { CHORD_TRANSPILATION } from './chord-transpitaliton';
import { Chord, Chords } from './chord.interface';
import {
  ALIAS_MAP, ALIAS_SUFFIX, CHORD_CLEAN_UP, REPLACE_BIMOLE, SHORT_MAP, TO_SHORT_MAP,
} from './chord.model';

export interface ChordList {
  text: string;
  type: 'text' | 'chord';
}

@Service()
export class ChordService {
  hasChord(dirtyChord: string): boolean {
    return !!this.getChord(dirtyChord);
  }

  getChord(dirtyChord: string): Chord {
    const chord = this.convertAlias(this.cleanUpChord(dirtyChord));
    const base = this.getBaseChord(chord) || '';
    const baseChord = CHORD_DATA.chords[base.replace('#', 'sharp') as keyof Chords];

    if (!baseChord || REPLACE_BIMOLE.test(dirtyChord[0])) {
      return null;
    }

    const suffix = this.normalizeSuffix(chord.slice(base.length));

    return baseChord.find((item) => item.suffix === suffix);
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

  getTextAndChord(text: string) {
    let lastIsChord = false;
    return this.getChordsList(text.split('\n')).reduce((acc, item) => {
      const lineSong = item.filter((value) => value.type === 'text' && value.text.trim());
      const chord = item.filter((value) => value.type === 'chord');
      const result = item.map((value) => value.text).join('');

      if (!result.trim() || lineSong.length > chord.length) {
        acc.text += `${result.trim()}\n`;

        if (!lastIsChord) {
          acc.chord += '\n';
        }

        lastIsChord = false;
      } else if (result) {
        const chordlist = result.trim().split(/\s+/g).map((data) => {
          // eslint-disable-next-line @typescript-eslint/no-shadow
          const chord = this.getChord(data);

          if (!chord) {
            return data;
          }

          // keep surrounding special symbols, e.g. "(E7)"
          const [, before, , after] = /^([^\w+/#♭]*)(.*?)([^\w+/#♭]*)$/.exec(data);

          return `${before}${this.getShortChord(chord)}${after}`;
        });

        acc.chord += `${chordlist.join(' ')}\n`;
        lastIsChord = true;
      }

      return acc;
    }, { text: '', chord: '' });
  }

  getBaseChord(chord: string): string {
    const base = chord.slice(0, 2);

    if (CHORD_DATA.keys.some((value) => value === base)) {
      return base;
    }

    return CHORD_DATA.keys.find((value) => value === base[0]);
  }

  getShortChord(chord: Chord): string {
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

  transpilationChord(baseChord: string, transpilation: number) {
    const index = CHORD_TRANSPILATION.indexOf(baseChord);
    const allowedSteps = CHORD_TRANSPILATION.length;

    if (index === -1) {
      // this not chord
      return baseChord;
    }

    let newPosition: number;

    if (transpilation < 0 && index + transpilation < 0) {
      newPosition = allowedSteps + index + transpilation;
    } else if (transpilation > 0 && index + transpilation >= allowedSteps) {
      newPosition = index + transpilation - allowedSteps;
    } else {
      newPosition = index + transpilation;
    }

    return CHORD_TRANSPILATION[newPosition];
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
