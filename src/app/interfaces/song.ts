export interface SongRequest {
  songs: Song[];
  last_update: string;
  has: string;
}

export interface Song {
  id: number;
  title: string;
  text: string;
  chord: string;
  tag: { [key: string]: number };
}
