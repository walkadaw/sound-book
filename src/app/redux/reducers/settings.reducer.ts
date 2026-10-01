import { createReducer, on } from '@ngrx/store';
import { MainSettings } from '../models/settings.state';
import {
  changeFontSizeAction,
  changeShowMenuAction,
  chordNotationAction,
  showChordAction,
} from '../actions/settings.actions';

const SETTINGS_STATE_DEFAULT: MainSettings = {
  fontSize: 1,
  showChord: true,
  chordNotation: 'full',
  showMenu: true,
};

export const settingsReducer = createReducer(
  SETTINGS_STATE_DEFAULT,
  on(showChordAction, (state, { showChord }): MainSettings => ({ ...state, showChord })),
  on(chordNotationAction, (state, { chordNotation }): MainSettings => ({ ...state, chordNotation })),
  on(changeFontSizeAction, (state, { fontSize }): MainSettings => ({ ...state, fontSize })),
  on(changeShowMenuAction, (state, { showMenu }): MainSettings => ({ ...state, showMenu })),
);
