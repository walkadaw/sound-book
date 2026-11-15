import { DOCUMENT, Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { EMPTY, Observable, combineLatest, fromEvent, merge, timer } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap } from 'rxjs/operators';

// Long enough to cover a song opened before the homily and played afterwards.
export const WAKE_LOCK_IDLE_TIMEOUT = 20 * 60 * 1000;

/** Keeps the screen on while the current route has `data: { wakeLock: true }` and the reader is active. */
@Service()
export class WakeLockService {
  private document = inject(DOCUMENT);
  private router = inject(Router);

  constructor() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    const navigated$ = this.router.events.pipe(filter((event) => event instanceof NavigationEnd));

    const wanted$ = navigated$.pipe(map(() => routeWantsLock(this.router.routerState.snapshot.root)));

    // The browser releases the lock itself when the page is hidden.
    const visible$ = fromEvent(this.document, 'visibilitychange').pipe(
      startWith(null),
      map(() => this.document.visibilityState === 'visible'),
    );

    // Musicians can't touch the screen while playing, so only a long silence counts as a forgotten phone.
    // Capture phase: a component stopping propagation must not hide the activity.
    const options = { capture: true, passive: true };
    const active$ = merge(
      fromEvent(this.document, 'pointerdown', options),
      fromEvent(this.document, 'keydown', options),
      fromEvent(this.document, 'wheel', options),
      navigated$,
      visible$.pipe(filter(Boolean)),
    ).pipe(
      switchMap(() =>
        timer(WAKE_LOCK_IDLE_TIMEOUT).pipe(
          map(() => false),
          startWith(true),
        ),
      ),
    );

    combineLatest([wanted$, visible$, active$])
      .pipe(
        map(([wanted, visible, active]) => wanted && visible && active),
        distinctUntilChanged(),
        switchMap((hold) => (hold ? screenLock() : EMPTY)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}

function routeWantsLock(route: ActivatedRouteSnapshot): boolean {
  while (route.firstChild) {
    route = route.firstChild;
  }

  return route.data['wakeLock'] === true;
}

// Holds the lock while subscribed; unsubscribing mid-request releases it once granted.
// A rejected request (e.g. low battery) is retried on the next change of state.
function screenLock(): Observable<never> {
  return new Observable<never>(() => {
    const lock = navigator.wakeLock.request('screen').catch((): null => null);

    return (): void => {
      lock.then((sentinel) => sentinel?.release());
    };
  });
}
