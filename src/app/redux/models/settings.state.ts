import { ChordNotation } from '../../services/chord/chord.model';

export type ChordPosition = 'inText' | 'right';
export interface MainSettings {
  showChord: boolean;
  chordPosition: ChordPosition;
  chordNotation: ChordNotation;
  showSongNumber: boolean;
  fontSize: number;
  showMenu: boolean;
  enableNoSleep: boolean;
}
