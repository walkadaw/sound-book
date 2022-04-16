import { SlideList } from './slide';

export interface Song {
  id: number;
  title: string;
  text: string;
  chord: string;
  tag: { [key: string]: number };
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
