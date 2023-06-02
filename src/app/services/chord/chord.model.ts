export const REPLACE_BIMOLE = /♭/g;
export const CHORD_CLEAN_UP = /[^\w+/#♭]/g;
export const SHORT_MAP: {[key: string]: string} = {
  c: 'Cm',
  cb: 'Cbm',
  cis: 'C#',
  'c#': 'C#m',

  d: 'Dm',
  db: 'Dbm',
  dis: 'D#',
  'd#': 'D#m',

  e: 'Em',
  eb: 'Ebm',
  eis: 'E#',
  'e#': 'E#m',

  f: 'Fm',
  fb: 'Fbm',
  fis: 'F#',
  'f#': 'F#m',

  g: 'Gm',
  gb: 'Gbm',
  gis: 'G#',
  'g#': 'G#m',

  a: 'Am',
  ab: 'Abm',
  ais: 'A#',
  'a#': 'A#m',

  b: 'Bm',
  bb: 'Bbm',
  bis: 'B#',
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
  'H#': 'C',
  'B#': 'C',
};

export const ALIAS_SUFFIX: {[key: string]: string} = {
  sus: 'sus4',
  m: 'minor',
};
