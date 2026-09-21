import { Service, inject } from '@angular/core';
import { ActivatedRoute, CanActivate, CanDeactivate } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import NoSleep from 'nosleep.js';
import { firstValueFrom, fromEvent } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';
import { changeNoSleepAction, changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getEnableNoSleep, getSettingsState } from '../../redux/selector/settings.selector';

@Service()
export class WakeLockService  implements CanActivate, CanDeactivate<boolean> {
  private store = inject<Store<IAppState>>(Store);
  private route = inject(ActivatedRoute);
  private actions$ = inject(Actions);

  private noSleep = new NoSleep();
  private settings = this.store.selectSignal(getSettingsState);
  private enableNoSleep = this.store.selectSignal(getEnableNoSleep);

  liveHookNoSleep$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(changeNoSleepAction, changeShowMenuAction),
        tap(() => {
          const { enableNoSleep, showMenu } = this.settings();

          if (!enableNoSleep || showMenu || !this.hasWakeLockGuard()) {
            this.disable();
            return;
          }

          this.enable();
        }),
      ),
    { dispatch: false },
  );

  get isEnabled(): boolean {
    return this.noSleep.isEnabled;
  }

  async enable() {
    if (!this.isEnabled) {
      if (document.visibilityState === 'hidden') {
        await firstValueFrom(
          fromEvent(document, 'visibilitychange').pipe(
            filter(() => document.visibilityState === 'visible'),
            take(1),
          ),
        );
      }

      this.noSleep.enable();
    }
  }

  disable() {
    if (this.isEnabled) {
      this.noSleep.disable();
    }
  }

  canActivate(): boolean {
    if (this.enableNoSleep() && !this.isEnabled) {
      this.enable();
    }

    return true;
  }

  canDeactivate(): boolean {
    if (this.enableNoSleep() && this.isEnabled) {
      this.disable();
    }

    return true;
  }

  private hasWakeLockGuard(): boolean {
    function lastRoute(route: ActivatedRoute): boolean {
      if (route.firstChild) {
        return lastRoute(route.firstChild);
      }

      if (!route?.routeConfig) {
        return false;
      }

      const { canActivate = [], canDeactivate = [] } = route.routeConfig;

      return canActivate.concat(canDeactivate).some((guard) => guard === WakeLockService);
    }

    return lastRoute(this.route);
  }
}
