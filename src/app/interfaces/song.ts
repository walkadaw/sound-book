export interface Song {
  id: number;
  title: string;
  text: string;
  chord: string;
  tag: { [key: string]: number };
}
