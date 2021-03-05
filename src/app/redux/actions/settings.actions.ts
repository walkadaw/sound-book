import { createAction } from '@ngrx/store';
import { ChordPosition } from '../models/settings.state';

export const showChordAction = createAction('[settings] chord', (showChord: boolean) => ({ showChord }));
export const chordPositionAction = createAction('[settings] chordPosition', (chordPosition: ChordPosition) => ({
  chordPosition,
}));
export const showSongNumberAction = createAction('[settings] song number', (showSongNumber: boolean) => ({
  showSongNumber,
}));
export const changeFontSizeAction = createAction('[settings] change font size', (fontSize: number) => ({ fontSize }));
export const changeShowMenuAction = createAction('[settings] change show menu', (showMenu: boolean) => ({ showMenu }));
