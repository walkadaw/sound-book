import { MainSettings } from '../models/settings.state';
import { createReducer, on } from '@ngrx/store';
import { changeFontSizeAction, showChordAction, showSongNumberAction } from '../actions/settings.actions';

const SETTINGS_STATE_DEFAULT: MainSettings = {
  fontSize: +window.localStorage.getItem('fontSize') || 1,
  showChord: window.localStorage.getItem('showChord') === '1',
  showSongNumber: window.localStorage.getItem('showSongNumber') === '1',
};

export const settingsReducer = createReducer(
  SETTINGS_STATE_DEFAULT,
  on(showChordAction, (state, { showChord }) => ({ ...state, showChord })),
  on(showSongNumberAction, (state, { showSongNumber }) => ({ ...state, showSongNumber })),
  on(changeFontSizeAction, (state, { fontSize }) => ({ ...state, fontSize }))
);
