import { LiturgyStatus } from '../../interfaces/liturgy';
import { SlideList } from '../../interfaces/slide';

// What a remote asks the presentation to do and what the presentation tells every remote back.
// Type aliases rather than interfaces: Trystero only sends values assignable to its JSON type, and an interface
// has no index signature to match it.
/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type RemoteSlide = { text: string; fontSize: number };

export type RemoteNoteLine = { chords: string; text: string };

export type RemoteSong = {
  // the song id, or the id of one part of a mass
  id: string;
  title: string;
  // the presentation id of the mass the part belongs to
  liturgy: string | null;
  startIndex: number;
  endIndex: number;
  slides: RemoteSlide[];
  notes: RemoteNoteLine[];
};

export type RemoteMass = { id: string; title: string };

// Where the song a remote asked for went in, null when it could not be added; the request names the asking.
export type RemoteAdded = { request: string; index: number | null };

export type RemoteState = {
  slide: number;
  songs: RemoteSong[];
  // the masses of the day, added or not
  masses: RemoteMass[];
  // sent with every update: a few letters, and a remote asking for the masses waits for it
  massesStatus: LiturgyStatus;
  light: boolean;
  blackout: boolean;
  // Time since the presentation started, as of sending: the clocks of two devices rarely agree.
  elapsed: number;
  remotes: number;
  // the latest additions, so that the remote that asked learns where its song went
  added: RemoteAdded[];
};

// The program goes only when it changed: a slide change would otherwise resend every song with its notes.
export type RemoteUpdate = Omit<RemoteState, 'songs' | 'masses'> & Partial<Pick<RemoteState, 'songs' | 'masses'>>;

// Theme and blackout carry the wanted value: two remotes toggling at once would cancel each other out.
// A slide or a song is named by its index and the id of the song: the program may have changed since the remote
// last heard of it, and then the index points elsewhere.
export type RemoteCommand =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'slide'; index: number; id: string }
  | { type: 'theme'; light: boolean }
  | { type: 'blackout'; hidden: boolean }
  | { type: 'add'; id: string; request: string }
  | { type: 'remove'; index: number; id: string }
  // `to` is the index of the song to stand before, the length of the program for the end
  | { type: 'move'; index: number; id: string; to: number }
  | { type: 'resetTimer' }
  // asks the server again for today's masses when the presentation has none
  | { type: 'refreshMasses' };
/* eslint-enable @typescript-eslint/consistent-type-definitions */

// 'busy': another device controls the presentation already.
// lost: the remote gave up trying; closed: the presentation disconnected it on purpose
export type ConnectionStatus = 'connecting' | 'connected' | 'lost' | 'busy' | 'closed';

export function remoteSongs(list: SlideList[]): RemoteSong[] {
  return list.map(({ id, title, liturgy, startIndex = 0, endIndex = 0, slides, text, chord }) => ({
    id,
    title,
    liturgy: liturgy ?? null,
    startIndex,
    endIndex,
    slides: slides.map((slide) => ({ text: slide.text, fontSize: slide.fontSize })),
    notes: noteLines(text, chord),
  }));
}

// Lyrics and chords come as two texts of the same number of lines.
function noteLines(text = '', chord = ''): RemoteNoteLine[] {
  if (!text.trim() && !chord.trim()) {
    return [];
  }

  const chords = chord.split('\n');

  return text.split('\n').map((line, index) => ({ chords: chords[index] ?? '', text: line }));
}

export function withoutProgram(state: RemoteState): RemoteUpdate {
  const update: RemoteUpdate = { ...state };

  delete update.songs;
  delete update.masses;

  return update;
}

/** The whole state from an update and the state before it; nothing until the program has come once. */
export function applyUpdate(current: RemoteState | null, update: RemoteUpdate): RemoteState | null {
  const songs = update.songs ?? current?.songs;
  const masses = update.masses ?? current?.masses;

  return songs && masses ? { ...update, songs, masses } : null;
}

export function remoteUrl(roomId: string): string {
  return new URL(`remote/${roomId}`, document.baseURI).href;
}

export function controlWindowUrl(presentationId: string): string {
  return new URL(`remote/window/${presentationId}`, document.baseURI).href;
}
