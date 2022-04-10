import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, Subject } from 'rxjs';
import { filter, map, startWith, takeUntil, withLatestFrom } from 'rxjs/operators';
import { WakeLockService } from 'src/app/services/wakelock/wake-lock.service';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFontSize, getShowMenu } from '../../redux/selector/settings.selector';

@Component({
  selector: 'app-main-sound',
  templateUrl: './main-sound.component.html',
  styleUrls: ['./main-sound.component.scss'],
})
export class MainSoundComponent implements OnInit, OnDestroy {
  showMenu$: Observable<boolean>;
  fontSize$ = this.store.select(getFontSize);

  private onDestroy$ = new Subject<void>();

  constructor(
    private store: Store<IAppState>,
    private router: Router,
  ) {}

  @HostListener('swipeleft')
  swipeLeft() {
    this.store.dispatch(changeShowMenuAction(false));
  }

  @HostListener('swiperight')
  swipeRight() {
    this.store.dispatch(changeShowMenuAction(true));
  }

  ngOnInit() {
    const navigate$ = this.router.events.pipe(filter((event) => event instanceof NavigationStart), map(s => s) );
    navigate$
      .pipe(
        withLatestFrom(this.store.select(getShowMenu)),
        filter(([, showMenu]) => showMenu),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => {
        this.store.dispatch(changeShowMenuAction(false));
      });

    this.showMenu$ = combineLatest([
      this.store.select(getShowMenu),
      navigate$.pipe(
        // FIXME: type
        map((value: any) => value.url),
        startWith(window.location.pathname),
        map((url) => url === '/')
      ),
    ]).pipe(map(([showMenu, rootUrl]) => showMenu || rootUrl));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
