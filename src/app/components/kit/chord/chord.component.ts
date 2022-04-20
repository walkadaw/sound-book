import {
  ChangeDetectionStrategy, Component, Input,
} from '@angular/core';
import { CHORD_DATA } from '../../../services/chord/chord-list';
import { Position } from '../../../services/chord/chord.interface';

interface Barre {
  key: number;
  capo: boolean;
  barre: number;
  finger: number;
  barreFrets: {
    position: number;
    value: number;
  }[];
  width: number;
}

interface Dot {
  key: number;
  string: number;
  fret: number;
  strings: number;
  finger: number;
}

interface ChordData {
  tuning: string[];
  strings: number;
  frets: number[];
  capo: boolean;
  fretsOnChord: number;
  baseFret: number;
  barres: Barre[];
  dots: Dot[],
}

function onlyBarres(frets: number[], barre: number) {
  return frets.map((f, index) => ({
    position: index,
    value: f,
  })).filter((f) => f.value === barre);
}

function onlyDots(chord: Position) {
  return chord.frets.map((f, index) => ({
    position: index,
    value: f,
  })).filter((f) => !chord.barres || chord.barres.indexOf(f.value) === -1);
}

@Component({
  selector: 'app-chord',
  templateUrl: './chord.component.svg',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordComponent {
  @Input() set chord(chord: Position) {
    if (!chord) {
      this.data = null;
      return;
    }

    this.setData(chord);
  }

  data: ChordData;

  fretXPosition: {[key: string]: number[] } = {
    4: [10, 20, 30, 40, 50],
    6: [0, 10, 20, 30, 40, 50],
  };

  fretYPosition = [2.35, 13.9, 26, 38];
  offset: {[key: string]: number} = {
    4: 0,
    6: -1,
  };

  positions = {
    string: [50, 40, 30, 20, 10, 0],
    fret: [-4, 6.5, 18, 30, 42, 54],
    finger: [-3, 8, 19.5, 31.5, 43.5],
  };

  radius = {
    open: 2,
    fret: 4,
  };

  offsets: {[key: string]: { x: number, y: number, length: number}} = {
    4: {
      x: 10,
      y: 10,
      length: 40,
    },
    6: {
      x: 0,
      y: 0,
      length: 50,
    },
  };

  private instrument = CHORD_DATA.main;

  getStringPosition(string: number, strings: number) {
    return this.positions.string[string + this.offset[strings]];
  }

  getNeckPath(strings: number, fretsOnChord: number) {
    return Array(fretsOnChord + 1).fill(undefined).map((_, pos) => this.getNeckHorizonalLine(pos, strings)).join(' ')
      .concat(Array(strings).fill(undefined).map((_, pos) => this.getNeckVerticalLine(pos, strings)).join(' '));
  }

  getBarreOffset(strings: number, frets: number[], baseFret: number, capo: boolean) {
    if (strings === 6) {
      if (frets[0] === 1 || capo) {
        if (baseFret > 9) {
          return -12;
        }

        return -11;
      } if (baseFret > 9) {
        return -10;
      }

      return -7;
    }

    if (frets[0] === 1 || capo) {
      if (baseFret > 9) {
        return -1;
      }

      return 0;
    }

    if (baseFret > 9) {
      return 3;
    }

    return 4;
  }

  private getNeckHorizonalLine(pos: number, strings: number) {
    return `M ${this.offsets[strings].x} ${12 * pos} H ${this.offsets[strings].length}`;
  }

  private getNeckVerticalLine(pos: number, strings: number) {
    return `M ${this.offsets[strings].y + pos * 10} 0 V 48`;
  }

  private setData(chord: Position) {
    this.data = {
      tuning: CHORD_DATA.tunings.standard,
      strings: this.instrument.strings,
      frets: chord.frets,
      capo: chord.capo,
      fretsOnChord: this.instrument.fretsOnChord,
      baseFret: chord.baseFret,
      barres: chord.barres.map((barre, index) => {
        const barreFrets = onlyBarres(chord.frets, barre);
        const string1 = barreFrets[0].position;
        const string2 = barreFrets[barreFrets.length - 1].position;

        return {
          key: index,
          capo: index === 0 && chord.capo,
          barre,
          finger: chord.fingers && chord.fingers[chord.frets.indexOf(barre)],
          barreFrets,
          width: (string2 - string1) * 10,
        };
      }),

      dots: onlyDots(chord).map((fret) => ({
        key: fret.position,
        string: this.instrument.strings - fret.position,
        fret: fret.value,
        strings: this.instrument.strings,
        finger: chord.fingers && chord.fingers[fret.position],
      })),

    };
  }
}
