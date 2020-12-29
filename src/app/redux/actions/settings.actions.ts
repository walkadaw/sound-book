import { createAction } from '@ngrx/store';

export const showChordAction = createAction('[settings] chord', (showChord: boolean) => ({ showChord }));
export const showSongNumberAction = createAction('[settings] song number', (showSongNumber: boolean) => ({
  showSongNumber,
}));
export const changeFontSizeAction = createAction('[settings] change font size', (fontSize: number) => ({ fontSize }));
