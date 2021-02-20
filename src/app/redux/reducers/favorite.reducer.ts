import { createReducer, on } from '@ngrx/store';
import { toggleFavoriteAction } from '../actions/favorite.actions';

const FAVORITE_STATE_DEFAULT: [number] = window.localStorage.getItem('favorite')
  ? JSON.parse(window.localStorage.getItem('favorite'))
  : [];

export const favoriteReducer = createReducer(
  FAVORITE_STATE_DEFAULT,
  on(toggleFavoriteAction, (state, { songId }) => {
    if (!state.includes(songId)) {
      return [...state, songId];
    } else {
      return state.filter((id) => id !== songId);
    }
  })
);
