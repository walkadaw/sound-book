import { ChordNotation } from '../../services/chord/chord.model';

export interface MainSettings {
  showChord: boolean;
  chordNotation: ChordNotation;
  fontSize: number;
  showMenu: boolean;
}
