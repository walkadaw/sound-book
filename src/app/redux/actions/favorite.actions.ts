import { createAction } from '@ngrx/store';

export const setFavoriteAction = createAction('[favorite] set', (favoriteList: number[]) => ({ favoriteList }));
export const toggleFavoriteAction = createAction('[favorite] toggle', (songId: number) => ({ songId }));
