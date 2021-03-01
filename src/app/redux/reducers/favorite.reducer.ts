import { createReducer, on } from '@ngrx/store';
import { setFavoriteAction, toggleFavoriteAction } from '../actions/favorite.actions';

const FAVORITE_STATE_DEFAULT: number[] = [];

export const favoriteReducer = createReducer(
  FAVORITE_STATE_DEFAULT,
  on(setFavoriteAction, (state, { favoriteList }) => favoriteList),
  on(toggleFavoriteAction, (state, { songId }) => {
    if (!state.includes(songId)) {
      return [...state, songId];
    } else {
      return state.filter((id) => id !== songId);
    }
  })
);
