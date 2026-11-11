import { signal } from '@angular/core';
import { entryEnd, moveEntry } from '../../services/program/program-entries';
import { ProgramControl, ProgramMass, ProgramSong } from './program-control';

/** A program kept in memory, the way the presentation keeps it; one slide a song unless told otherwise. */
export class FakeProgram implements ProgramControl {
  readonly songs = signal<ProgramSong[]>([]);
  readonly masses = signal<ProgramMass[]>([]);
  readonly slide = signal(0);
  readonly enabled = signal(true);
  readonly calls: string[] = [];
  // the parts a mass of the day comes with
  massParts: Record<string, string[]> = {};

  constructor(ids: string[] = [], masses: ProgramMass[] = []) {
    this.songs.set(withIndexes(ids.map((name) => song(name))));
    this.masses.set(masses);
  }

  add(id: string): Promise<number | null> {
    const parts = this.massParts[id];
    const added = parts ? parts.map((part) => song(`${part}@${id}`)) : [song(id)];
    const index = this.songs().length;

    this.calls.push(`add ${id}`);
    this.songs.update((songs) => withIndexes([...songs, ...added]));

    return Promise.resolve(index);
  }

  remove(index: number, id: string) {
    const songs = this.songs();

    this.calls.push(`remove ${index} ${id}`);

    if (songs[index]?.id === id) {
      const end = entryEnd(songs, index);

      this.songs.set(withIndexes([...songs.slice(0, index), ...songs.slice(end)]));
    }
  }

  move(index: number, id: string, to: number) {
    this.calls.push(`move ${index} ${id} ${to}`);

    const moved = this.songs()[index]?.id === id ? moveEntry(this.songs(), index, to) : null;

    if (moved) {
      this.songs.set(withIndexes(moved));
    }
  }

  goTo(slide: number) {
    this.calls.push(`goTo ${slide}`);
    this.slide.set(slide);
  }

  ids(): string[] {
    return this.songs().map(({ id }) => id);
  }
}

// "id" for a song, "id@mass" for a part of a mass
function song(name: string): ProgramSong {
  const [id, liturgy = null] = name.split('@');

  return { id, title: liturgy ? `Частка ${id}` : `Песня ${id}`, liturgy, startIndex: 0, endIndex: 0 };
}

function withIndexes(songs: ProgramSong[]): ProgramSong[] {
  return songs.map((item, index) => ({ ...item, startIndex: index, endIndex: index }));
}
