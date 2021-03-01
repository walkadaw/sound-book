import { MainSettings } from '../models/settings.state';
import { createReducer, on } from '@ngrx/store';
import {
  changeFontSizeAction,
  changeShowMenuAction,
  showChordAction,
  showSongNumberAction,
} from '../actions/settings.actions';

const SETTINGS_STATE_DEFAULT: MainSettings = {
  fontSize: 1,
  showChord: false,
  showSongNumber: false,
  showMenu: true,
};

export const settingsReducer = createReducer(
  SETTINGS_STATE_DEFAULT,
  on(showChordAction, (state, { showChord }) => ({ ...state, showChord })),
  on(showSongNumberAction, (state, { showSongNumber }) => ({ ...state, showSongNumber })),
  on(changeFontSizeAction, (state, { fontSize }) => ({ ...state, fontSize })),
  on(changeShowMenuAction, (state, { showMenu }) => ({ ...state, showMenu }))
);
