/** short: "a", "c#7" (lowercase for minor); full: "Am", "C#m7" */
export type ChordNotation = 'short' | 'full';

export const REPLACE_BIMOLE = /♭/g;
export const CHORD_CLEAN_UP = /[^\w+/#♭]/g;
export const SHORT_MAP: {[key: string]: string} = {
  c: 'Cm',
  cb: 'Cbm',
  Cis: 'C#',
  cis: 'C#m',
  'c#': 'C#m',

  d: 'Dm',
  db: 'Dbm',
  Dis: 'D#',
  dis: 'D#m',
  'd#': 'D#m',

  e: 'Em',
  eb: 'Ebm',
  Eis: 'E#',
  eis: 'E#m',
  'e#': 'E#m',

  f: 'Fm',
  fb: 'Fbm',
  Fis: 'F#',
  fis: 'F#m',
  'f#': 'F#m',

  g: 'Gm',
  gb: 'Gbm',
  Gis: 'G#',
  gis: 'G#m',
  'g#': 'G#m',

  a: 'Am',
  ab: 'Abm',
  Ais: 'A#',
  ais: 'A#m',
  'a#': 'A#m',

  b: 'Bm',
  bb: 'Bbm',
  Bis: 'B#',
  bis: 'B#m',
  'b#': 'B#m',
};

export const TO_SHORT_MAP = Object.fromEntries(
  Object.entries(SHORT_MAP).filter(([key]) => !key.endsWith('is')).map(([key, value]) => ([value, key])),
);

export const ALIAS_MAP: {[key: string]: string} = {
  Ab: 'G#',
  Abm: 'G#m',
  Eb: 'D#',
  Ebm: 'D#m',
  Db: 'C#',
  Dbm: 'C#m',
  'A#': 'Bb',
  'A#m': 'Bbm',
  H: 'B',
  h: 'Bm',
  'H#': 'C',
  'B#': 'C',
};

export const ALIAS_SUFFIX: {[key: string]: string} = {
  sus: 'sus4',
  '7sus': '7sus4',
  m: 'minor',
};
