import { createSelector } from '@ngrx/store';
import { IAppState } from '../models/IAppState';

export const getSettingsState = (state: IAppState) => state.settings || {};

export const getShowChord = createSelector(getSettingsState, (state) => state.showChord);
export const getChordPosition = createSelector(getSettingsState, (state) => state.chordPosition);
export const getShowSongNumber = createSelector(getSettingsState, (state) => state.showSongNumber);
export const getFontSize = createSelector(getSettingsState, (state) => state.fontSize);
export const getShowMenu = createSelector(getSettingsState, (state) => state.showMenu);
export const getEnableNoSleep = createSelector(getSettingsState, (state) => state.enableNoSleep);
