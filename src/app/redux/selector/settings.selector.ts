import { IAppState } from '../models/IAppState';
import { createSelector } from '@ngrx/store';

export const getSettingsState = (state: IAppState) => state.settings || {};

export const getShowChord = createSelector(getSettingsState, (state) => state.showChord);
export const getShowSongNumber = createSelector(getSettingsState, (state) => state.showSongNumber);
export const getFontSize = createSelector(getSettingsState, (state) => state.fontSize);
export const getShowMenu = createSelector(getSettingsState, (state) => state.showMenu);
