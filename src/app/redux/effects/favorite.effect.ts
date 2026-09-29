import { Service, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { SongStatsService } from '../../services/song-stats/song-stats.service';
import { toggleFavoriteAction } from '../actions/favorite.actions';
import { IAppState } from '../models/IAppState';
import { getFavoriteState } from '../selector/favorite.selector';

@Service()
export class FavoriteEffects {
  private actions$ = inject(Actions);
  private store = inject<Store<IAppState>>(Store);
  private songStats = inject(SongStatsService);

  saveFavorite$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(toggleFavoriteAction),
        withLatestFrom(this.store.select(getFavoriteState)),
        tap(([{ songId }, favorite]) => {
          window.localStorage.setItem('favorite', JSON.stringify([...favorite]));

          // The state is already toggled here, so only additions are counted.
          if (favorite.has(songId)) {
            this.songStats.record('favorite', songId);
          }
        }),
      ),
    { dispatch: false },
  );
}
