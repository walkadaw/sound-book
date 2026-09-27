import { createAction } from '@ngrx/store';
import { ChordNotation } from '../../services/chord/chord.model';
import { ChordPosition } from '../models/settings.state';

export const showChordAction = createAction('[settings] chord', (showChord: boolean) => ({ showChord }));
export const chordPositionAction = createAction('[settings] chordPosition', (chordPosition: ChordPosition) => ({
  chordPosition,
}));
export const chordNotationAction = createAction('[settings] chordNotation', (chordNotation: ChordNotation) => ({
  chordNotation,
}));
export const changeFontSizeAction = createAction('[settings] change font size', (fontSize: number) => ({ fontSize }));

export const changeShowMenuAction = createAction('[UI] change show menu', (showMenu: boolean) => ({ showMenu }));
