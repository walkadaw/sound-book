import { Signal } from '@angular/core';
import { LiturgyStatus } from '../../interfaces/liturgy';

export interface ProgramSong {
  // the song id, or the id of one part of a mass
  id: string;
  title: string;
  // the presentation id of the mass the part belongs to
  liturgy: string | null;
  startIndex: number;
  endIndex: number;
}

export interface ProgramMass {
  id: string;
  title: string;
}

/**
 * The program of a presentation as the program panel sees it: the presentation itself, or a remote that sends
 * every change over to it. A song is named by its index and its id, since the program may change in between.
 */
export interface ProgramControl {
  readonly songs: Signal<readonly ProgramSong[]>;
  // the masses of the day, added or not
  readonly masses: Signal<readonly ProgramMass[]>;
  readonly massesStatus: Signal<LiturgyStatus>;
  readonly slide: Signal<number>;
  // a remote that lost the presentation shows the program but changes nothing
  readonly enabled: Signal<boolean>;
  /** Adds at the end; resolves with the index of the added song once the program has it, or null. */
  add(id: string): Promise<number | null>;
  remove(index: number, id: string): void;
  /** Moves the song or the whole mass at `index` to stand before the song now at `to`. */
  move(index: number, id: string, to: number): void;
  goTo(slide: number): void;
  /** Asks again for today's masses when there are none: no internet when the presentation opened, say. */
  refreshMasses(): void;
}
