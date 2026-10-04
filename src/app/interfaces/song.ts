import { SlideList } from './slide';

export interface Song {
  id: number;
  songId: number;
  title: string;
  text: string;
  chord: string;
  tag: { [key: string]: number };
}

export interface SongAdd {
  id: number;
  title: string;
  text: string;
  chord: string;
  tag: string;
}

export interface SongVersion {
  id: number;
  title: string;
  text: string;
  chord: string;
  tag: string;
  /** null for the version a song had before its history started */
  userName: string | null;
  /** unix seconds; null for the version a song had before its history started */
  createdAt: number | null;
  /** unix seconds of the last save folded into this version */
  updatedAt: number | null;
}

export interface SongFavorite extends Song {
  favorite?: boolean;
}

export interface SongRequest {
  songs?: Song[];
  slides?: SlideList[];
  last_update: string;
  hash: string;
}
