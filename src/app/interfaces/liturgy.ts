// 'procession' is the gospel read at the Palm Sunday procession, before the mass
export type LiturgySectionType = 'reading' | 'psalm' | 'sequence' | 'acclamation' | 'gospel' | 'procession';

// The subtitle, the opening line ("Чытанне кнігі…") and the rubrics are shown but not read aloud:
// the rubrics are reference notes for the reader and never go on the slides.
export type LiturgyBlockKind = 'subtitle' | 'intro' | 'text' | 'refrain' | 'acclamation' | 'rubric' | 'conclusion';

export interface LiturgyBlock {
  kind: LiturgyBlockKind;
  // HTML with bold and italics only; the refrain and the acclamation come without their "Рэфрэн:" label
  lines: string[];
}

export interface LiturgySection {
  type: LiturgySectionType;
  title: string;
  // Bible reference, empty for the sequence
  reference: string;
  blocks: LiturgyBlock[];
}

// One mass of the day with only the texts of that day's liturgical year.
export interface Liturgy {
  id: number;
  // the short reference list from the catholic.by calendar
  readings: string;
  // the catholic.by page the texts were taken from
  url: string;
  title: string;
  sections: LiturgySection[];
}

// The masses by their day (YYYY-MM-DD), the default one first.
export type LiturgyDays = Record<string, Liturgy[]>;

// What a presentation knows of today's masses: they are there, they are not (no internet, not out yet), or
// they are being asked for.
export type LiturgyStatus = 'ready' | 'missing' | 'loading';
