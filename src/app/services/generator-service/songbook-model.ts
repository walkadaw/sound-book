import { PARTS_OF_MASS_TAG_ID, TAGS_LIST } from '../../constants/tag-list';
import { Song } from '../../interfaces/song';
import { Stanza, StructureIssue, songStructure } from '../chord/song-structure';

export interface PrintOptions {
  showChords: boolean;
  showTags: boolean;
  /** Print a refrain again every time the text repeats it, or only the first time */
  repeatChoruses: boolean;
}

export interface PrintSong {
  id: number;
  /** The number of the song on the site; the parts of the mass have none */
  number?: number;
  title: string;
  tagIds: number[];
  stanzas: Stanza[];
  issues: StructureIssue[];
}

// "Часткі імшы" is the section these songs are printed in, so it is not shown as a tag
const TAG_IDS = new Set(TAGS_LIST.map(({ id }) => id).filter((id) => id !== PARTS_OF_MASS_TAG_ID));

export function songTagIds(song: Pick<Song, 'tag'>): number[] {
  // the API sends an empty array instead of an empty object
  if (!song.tag || Array.isArray(song.tag)) {
    return [];
  }

  return Object.keys(song.tag)
    .map(Number)
    .filter((id) => TAG_IDS.has(id));
}

const stanzaKey = (stanza: Stanza) =>
  stanza.lines
    .map(({ text }) => text)
    .join(' ')
    .toLowerCase()
    .replace(/[^\p{L}\d]+/gu, ' ')
    .trim();

export function printSong(song: Song, options: PrintOptions, numbered = true): PrintSong {
  const { stanzas, issues } = songStructure(song);
  const printedRefrains = new Set<string>();

  const printed = stanzas
    .filter((stanza) => {
      if (stanza.kind !== 'chorus' || options.repeatChoruses) {
        return true;
      }

      const key = stanzaKey(stanza);
      const repeated = printedRefrains.has(key);
      printedRefrains.add(key);
      return !repeated;
    })
    .map((stanza) =>
      options.showChords
        ? stanza
        : { ...stanza, lines: stanza.lines.filter(({ text }) => text).map(({ text }) => ({ text, chords: '' })) },
    );

  return {
    id: song.id,
    ...(numbered ? { number: song.songId } : {}),
    title: song.title.trim(),
    tagIds: options.showTags ? songTagIds(song) : [],
    stanzas: printed,
    issues,
  };
}
