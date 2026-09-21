import { Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, CanActivate, CanDeactivate } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { fromEvent } from 'rxjs';
import { tap } from 'rxjs/operators';
import { changeNoSleepAction, changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getEnableNoSleep, getSettingsState } from '../../redux/selector/settings.selector';

@Service()
export class WakeLockService implements CanActivate, CanDeactivate<boolean> {
  private store = inject<Store<IAppState>>(Store);
  private route = inject(ActivatedRoute);
  private actions$ = inject(Actions);

  private sentinel: WakeLockSentinel | null = null;
  private wanted = false;
  private settings = this.store.selectSignal(getSettingsState);
  private enableNoSleep = this.store.selectSignal(getEnableNoSleep);

  readonly isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  liveHookNoSleep$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(changeNoSleepAction, changeShowMenuAction),
        tap(() => this.sync()),
      ),
    { dispatch: false },
  );

  constructor() {
    // The browser releases the lock itself when the page is hidden; re-acquire it when visible again.
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.sync());
  }

  get isEnabled(): boolean {
    return this.wanted;
  }

  async enable(): Promise<void> {
    this.wanted = true;

    if (!this.isSupported || this.sentinel || document.visibilityState === 'hidden') {
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen');

      // Disabled (or requested twice) while the request was pending.
      if (!this.wanted || this.sentinel) {
        await sentinel.release();
        return;
      }

      this.sentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) {
          this.sentinel = null;
        }
      });
    } catch {
      // Request can be rejected (e.g. low battery); the next sync will retry.
    }
  }

  disable(): void {
    this.wanted = false;

    const sentinel = this.sentinel;
    this.sentinel = null;
    sentinel?.release().catch((): void => {});
  }

  canActivate(): boolean {
    if (this.enableNoSleep()) {
      this.enable();
    }

    return true;
  }

  canDeactivate(): boolean {
    if (this.enableNoSleep()) {
      this.disable();
    }

    return true;
  }

  private sync(): void {
    const { enableNoSleep, showMenu } = this.settings();

    if (!enableNoSleep || showMenu || !this.hasWakeLockGuard()) {
      this.disable();
      return;
    }

    // Keep `wanted` while hidden so the lock is re-acquired on return.
    this.enable();
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
