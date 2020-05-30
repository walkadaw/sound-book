import { SlideList } from './slide';

export interface SongRequest {
  songs?: Song[];
  slides?: SlideList[];
  last_update: string;
  hash: string;
}

export interface Song {
  id: number;
  title: string;
  text: string;
  chord: string;
  tag: { [key: string]: number };
}
