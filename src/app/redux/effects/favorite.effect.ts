import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { toggleFavoriteAction } from '../actions/favorite.actions';
import { IAppState } from '../models/IAppState';
import { getFavoriteState } from '../selector/favorite.selector';

@Injectable()
export class FavoriteEffects {
  saveFavorite$ = createEffect(
    () => this.actions$.pipe(
      ofType(toggleFavoriteAction),
      withLatestFrom(this.store.select(getFavoriteState)),
      tap(([, favorite]) => {
        window.localStorage.setItem('favorite', JSON.stringify([...favorite]));
      }),
    ),
    { dispatch: false },
  );

  constructor(private actions$: Actions, private store: Store<IAppState>) {}
}
