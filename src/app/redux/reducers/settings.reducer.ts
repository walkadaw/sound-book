import { MainSettings } from '../models/settings.state';
import { createReducer, on } from '@ngrx/store';
import {
  changeFontSizeAction,
  changeShowMenuAction,
  chordPositionAction,
  showChordAction,
  showSongNumberAction,
} from '../actions/settings.actions';

const SETTINGS_STATE_DEFAULT: MainSettings = {
  fontSize: 1,
  showChord: false,
  chordPosition: 'right',
  showSongNumber: false,
  showMenu: true,
};

export const settingsReducer = createReducer(
  SETTINGS_STATE_DEFAULT,
  on(showChordAction, (state, { showChord }) => ({ ...state, showChord })),
  on(chordPositionAction, (state, { chordPosition }) => ({ ...state, chordPosition })),
  on(showSongNumberAction, (state, { showSongNumber }) => ({ ...state, showSongNumber })),
  on(changeFontSizeAction, (state, { fontSize }) => ({ ...state, fontSize })),
  on(changeShowMenuAction, (state, { showMenu }) => ({ ...state, showMenu }))
);
