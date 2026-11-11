import { entryEnd } from '../../../services/program/program-entries';
import { ProgramMass, ProgramSong } from '../program-control';

export type EntryStatus = 'past' | 'active' | 'future';

/** A song, or one part of a mass: what the screen can jump to. */
export interface ProgramItemView {
  startIndex: number;
  title: string;
  status: EntryStatus;
  // the slides to jump between; empty unless it is on the screen
  slides: number[];
}

/** One row of the program: a song, or a whole mass with its parts. It moves and goes away as a whole. */
export interface ProgramEntry extends ProgramItemView {
  // the index of the first song of the entry, and the index right after its last one
  index: number;
  end: number;
  // the id of the first song, which names the entry in the commands
  id: string;
  liturgy: string | null;
  // the parts of a mass; empty for a song
  parts: ProgramItemView[];
}

export function programEntries(
  songs: readonly ProgramSong[],
  masses: readonly ProgramMass[],
  slide: number,
): ProgramEntry[] {
  const entries: ProgramEntry[] = [];

  for (let index = 0; index < songs.length; index = entryEnd(songs, index)) {
    const end = entryEnd(songs, index);
    const first = songs[index];
    const last = songs[end - 1];
    const status = statusOf(first.startIndex, last.endIndex, slide);

    if (!first.liturgy) {
      entries.push({ ...itemView(first, slide), index, end, id: first.id, liturgy: null, parts: [] });
      continue;
    }

    entries.push({
      index,
      end,
      id: first.id,
      liturgy: first.liturgy,
      startIndex: first.startIndex,
      title: masses.find(({ id }) => id === first.liturgy)?.title ?? 'Імша',
      status,
      slides: [],
      parts: songs.slice(index, end).map((part) => itemView(part, slide)),
    });
  }

  return entries;
}

function itemView({ title, startIndex, endIndex }: ProgramSong, slide: number): ProgramItemView {
  const status = statusOf(startIndex, endIndex, slide);
  const count = endIndex - startIndex + 1;

  return {
    startIndex,
    title,
    status,
    slides: status === 'active' ? Array.from({ length: count }, (_, i) => startIndex + i) : [],
  };
}

function statusOf(startIndex: number, endIndex: number, slide: number): EntryStatus {
  return slide < startIndex ? 'future' : slide > endIndex ? 'past' : 'active';
}
