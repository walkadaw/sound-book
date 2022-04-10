import { Injectable } from '@angular/core';
import { ActivatedRoute, CanActivate, CanDeactivate } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import NoSleep from 'nosleep.js';
import { firstValueFrom, fromEvent, Observable } from 'rxjs';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import { changeNoSleepAction, changeShowMenuAction } from 'src/app/redux/actions/settings.actions';
import { IAppState } from 'src/app/redux/models/IAppState';
import { getEnableNoSleep, getSettingsState } from 'src/app/redux/selector/settings.selector';

@Injectable({
  providedIn: 'root'
})
export class WakeLockService implements CanActivate, CanDeactivate<any> {
  private noSleep = new NoSleep();

  liveHookNoSleep$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(changeNoSleepAction, changeShowMenuAction),
        switchMap(() => this.store.select(getSettingsState).pipe(take(1))),
        tap(({ enableNoSleep, showMenu }) => {

          if(!enableNoSleep || showMenu || !this.hasWakeLockGuard()) {
            this.disable();
            return;
          }

          this.enable();
        }),
      ),
    { dispatch: false }
  );


  constructor(
    private store: Store<IAppState>,
    private route: ActivatedRoute,
    private actions$: Actions,
  ) { }

  get isEnabled(): boolean {
    return this.noSleep.isEnabled;
  }

  async enable() {
    if (!this.isEnabled) {
      if (document.visibilityState === 'hidden') {
        await firstValueFrom(fromEvent(document, 'visibilitychange').pipe(
          filter(() => document.visibilityState === 'visible'),
          take(1)
        ));
      }

      this.noSleep.enable();
    }
  }

  disable() {
    if (this.isEnabled) {
      this.noSleep.disable();
    }
  }

  canActivate(): Observable<boolean> {
    return this.store.select(getEnableNoSleep).pipe(map(enable => {
      if (enable && !this.isEnabled) {
        this.enable();
      }

      return true;
    }));
  }

  canDeactivate(): Observable<boolean> {
    return this.store.select(getEnableNoSleep).pipe(map(enable => {
      if (enable && this.isEnabled) {
        this.disable();
      }

      return true;
    }));
  }

  private hasWakeLockGuard(): boolean {
    function lastRoute(route: ActivatedRoute): boolean {
      if (route.firstChild) {
        return lastRoute(route.firstChild);
      }

      if (!route?.routeConfig) {
        return false
      }

      const { canActivate = [], canDeactivate = [] } = route.routeConfig;

      return canActivate.concat(canDeactivate).some(guard => guard === WakeLockService)
    }

    return lastRoute(this.route);
  }
}
