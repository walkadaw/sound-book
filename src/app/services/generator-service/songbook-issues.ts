import { Song } from '../../interfaces/song';
import { SongStructure, StructureIssue } from '../chord/song-structure';
import { approximateMeasure, layoutSong } from './songbook-layout';
import { PrintOptions, printSong } from './songbook-model';

export interface SongbookIssue {
  song: Pick<Song, 'id' | 'songId' | 'title'>;
  message: string;
  /** Hints are things worth a look, not mistakes */
  hint?: boolean;
}

const CYRILLIC = /\p{Script=Cyrillic}/u;
const LATIN = /[A-Za-z]/;

export function structureIssueMessage(issue: StructureIssue): string {
  switch (issue.kind) {
    case 'label-without-stanza':
      return `Пасля «${issue.text}» няма страфы`;
    case 'chords-on-hidden-line':
      return `Акорды «${issue.chords}» стаяць на радку «${issue.text}», які не друкуецца`;
    case 'chords-without-lyrics':
      return `Акорды «${issue.chords}» стаяць над пустым радком і ссунуць слупок акордаў`;
    case 'unknown-directive':
      return `Невядомая дырэктыва «${issue.text}»`;
    case 'verse-numbering':
      return `Нумары куплетаў ідуць не па парадку: ${issue.numbers.join(', ')}`;
  }
}

/** Words that mix Latin and Cyrillic letters, like "БIЦЕ" typed with a Latin "I" */
export function mixedScriptWords(text: string): string[] {
  return text.split(/[^\p{L}]+/u).filter((word) => CYRILLIC.test(word) && LATIN.test(word));
}

export function songIssues(song: Song, structure: SongStructure): SongbookIssue[] {
  const issues: SongbookIssue[] = [
    ...structure.issues.map((issue) => ({ song, message: structureIssueMessage(issue) })),
    ...mixedScriptWords(song.title).map((word) => ({
      song,
      message: `У назве лацінскія літары сярод кірылічных: «${word}»`,
    })),
  ];
  const kinds = new Set(structure.stanzas.map(({ kind }) => kind));

  if (kinds.has('verse') && kinds.has('plain')) {
    issues.push({
      song,
      hint: true,
      message: 'Страфа без нумара сярод куплетаў: калі гэта прыпеў, дадайце над ёй радок «Прыпеў:»',
    });
  }

  return issues;
}

/** Measured roughly: the fonts are only loaded when the file is made */
export function lengthIssues(song: Song, options: PrintOptions, numbered = true): SongbookIssue[] {
  const { keepTogether } = layoutSong(printSong(song, options, numbered), approximateMeasure);

  return keepTogether
    ? []
    : [{ song, hint: true, message: 'Песня даўжэйшая за старонку, яе страфы трапяць на розныя старонкі' }];
}
