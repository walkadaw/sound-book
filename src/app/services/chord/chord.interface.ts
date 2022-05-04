export interface Main {
  strings: number;
  fretsOnChord: number;
  name: string;
  numberOfChords: number;
}

export interface Tunings {
  standard: string[];
}

export interface Position {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
  capo?: boolean;
}

export interface Chord {
  key: string;
  suffix: string;
  positions: Position[];
}

export interface Chords {
  C: Chord[];
  Csharp: Chord[];
  D: Chord[];
  Dsharp: Chord[];
  E: Chord[];
  F: Chord[];
  Fsharp: Chord[];
  G: Chord[];
  Gsharp: Chord[];
  A: Chord[];
  Bb: Chord[];
  B: Chord[];
}

export interface ChordData {
  main: Main;
  tunings: Tunings;
  keys: string[];
  suffixes: string[];
  chords: Chords;
}
