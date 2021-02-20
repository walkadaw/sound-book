import { createAction } from '@ngrx/store';

export const toggleFavoriteAction = createAction('[favorite] toggle', (songId: number) => ({ songId }));
