import { Injectable } from '@angular/core';
import { CHORD_DATA } from './chord-list';
import { Chord, Chords } from './chord.interface';

export interface ChordList {
  text: string;
  type: 'text' | 'chord';
}

const MINOR = 'm';
const REPLACE_BIMOLE = /♭/g;
const CHORD_CLEAN_UP = /[^\w+/#]/g;
const SHORT_MAP: {[key: string]: string} = {
  c: 'Cm',
  'c#': 'C#m',
  d: 'Dm',
  e: 'Em',
  eb: 'Ebm',
  f: 'Fm',
  'f#': 'F#m',
  fis: 'F#',
  g: 'Gm',
  a: 'Am',
  ab: 'Abm',
  b: 'Bm',
  bb: 'Bbm',
  Ab: 'G#',
};

@Injectable({
  providedIn: 'root',
})
export class ChordService {
  hasChord(dirtyChord: string): boolean {
    return !!this.getChord(dirtyChord);
  }

  getChord(dirtyChord: string): Chord {
    const chord = this.convertAlias(this.cleanUpChord(dirtyChord));
    const base = this.getBaseChord(chord) || '';
    const baseChord = CHORD_DATA.chords[base.replace('#', 'sharp') as keyof Chords];

    if (!baseChord) {
      return null;
    }

    let suffix = chord.slice(base.length);

    if (!suffix) {
      suffix = 'major';
    }

    if (suffix === MINOR) {
      suffix = 'minor';
    }

    return baseChord.find((item) => item.suffix === suffix);
  }

  getChordsList(lins: string[]): ChordList[][] {
    return lins.map((line) => line.split(/[\s]/).reduce<ChordList[]>((acc, text, indexLine, array) => {
      const clear = this.cleanUpChord(text.trim());
      let tmpText = text;
      if (indexLine !== array.length - 1) {
        tmpText += ' ';
      }

      if (clear) {
        const chordList = this.hasChord(clear) ? [clear] : this.findChordInText(clear);
        chordList.forEach((chord) => {
          const index = this.replaceBimole(tmpText).indexOf(chord);

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
    let addEmptyLineChord = 0;

    return this.getChordsList(text.split('\n')).reduce((acc, item) => {
      const lineSong = item.filter((value) => value.type === 'text' && value.text.trim());
      const chord = item.filter((value) => value.type === 'chord');
      const result = item.map((value) => value.text).join('');

      if (!result.trim()) {
        acc.text += '\n';
        addEmptyLineChord += 1;
      } else if (lineSong.length > chord.length) {
        acc.text += `${result.trimRight()}\n`;
        addEmptyLineChord += 1;
      } else {
        acc.chord += `${result.trimRight()}\n`;
        addEmptyLineChord = 0;
      }

      if (addEmptyLineChord > 1) {
        acc.chord += '\n';
      }

      return acc;
    }, { text: '', chord: '' });
  }

  private getBaseChord(chord: string): string {
    const base = chord.slice(0, 2);

    if (CHORD_DATA.keys.some((value) => value === base)) {
      return base;
    }

    return CHORD_DATA.keys.find((value) => value === base[0]);
  }

  private convertAlias(chord: string) {
    if (chord.length > 2 && SHORT_MAP[chord.slice(0, 3)]) {
      return SHORT_MAP[chord.slice(0, 3)] + chord.slice(3);
    }

    if (chord.length > 1 && SHORT_MAP[chord.slice(0, 2)]) {
      return SHORT_MAP[chord.slice(0, 2)] + chord.slice(2);
    }

    if (SHORT_MAP[chord.slice(0, 1)]) {
      return SHORT_MAP[chord.slice(0, 1)] + chord.slice(1);
    }

    return chord;
  }

  private cleanUpChord(dirtyChord: string): string {
    return this.replaceBimole(dirtyChord).replace(CHORD_CLEAN_UP, '');
  }

  private replaceBimole(chord: string): string {
    return chord.replace(REPLACE_BIMOLE, 'b');
  }

  private findChordInText(origin: string, match?: string, acc: string[] = [], endLine = 1): string[] {
    if (endLine <= origin.length) {
      const testChord = origin.slice(0, endLine);
      return this.findChordInText(origin, this.hasChord(testChord) ? testChord : match, acc, endLine + 1);
    }

    if (!match) {
      return acc;
    }

    acc.push(match);

    const newOrigin = origin.slice(match.length);
    if (newOrigin) {
      return this.findChordInText(newOrigin, undefined, acc);
    }

    return acc;
  }
}
