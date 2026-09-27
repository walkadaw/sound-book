import { createReducer, on } from '@ngrx/store';
import { MainSettings } from '../models/settings.state';
import {
  changeFontSizeAction,
  changeNoSleepAction,
  changeShowMenuAction,
  chordNotationAction,
  chordPositionAction,
  showChordAction,
  showSongNumberAction,
} from '../actions/settings.actions';

const SETTINGS_STATE_DEFAULT: MainSettings = {
  fontSize: 1,
  showChord: false,
  chordPosition: 'right',
  chordNotation: 'short',
  showSongNumber: false,
  showMenu: true,
  enableNoSleep: false,
};

export const settingsReducer = createReducer(
  SETTINGS_STATE_DEFAULT,
  on(showChordAction, (state, { showChord }): MainSettings => ({ ...state, showChord })),
  on(chordPositionAction, (state, { chordPosition }): MainSettings => ({ ...state, chordPosition })),
  on(chordNotationAction, (state, { chordNotation }): MainSettings => ({ ...state, chordNotation })),
  on(showSongNumberAction, (state, { showSongNumber }): MainSettings => ({ ...state, showSongNumber })),
  on(changeFontSizeAction, (state, { fontSize }): MainSettings => ({ ...state, fontSize })),
  on(changeShowMenuAction, (state, { showMenu }): MainSettings => ({ ...state, showMenu })),
  on(changeNoSleepAction, (state, { enableNoSleep }): MainSettings => ({ ...state, enableNoSleep })),
);
