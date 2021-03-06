import { Component, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { filter, takeUntil, withLatestFrom } from 'rxjs/operators';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFontSize, getShowMenu } from '../../redux/selector/settings.selector';

@Component({
  selector: 'app-main-sound',
  templateUrl: './main-sound.component.html',
  styleUrls: ['./main-sound.component.scss'],
})
export class MainSoundComponent implements OnInit, OnDestroy {
  showMenu$ = this.store.select(getShowMenu);
  fontSize$ = this.store.select(getFontSize);
  private onDestroy$ = new Subject<void>();

  constructor(private store: Store<IAppState>, private router: Router) {}

  @HostListener('swipeleft')
  swipeLeft() {
    this.store.dispatch(changeShowMenuAction(false));
  }

  @HostListener('swiperight')
  swipeRight() {
    this.store.dispatch(changeShowMenuAction(true));
  }

  ngOnInit() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        withLatestFrom(this.store.select(getShowMenu)),
        filter(([, showMenu]) => showMenu),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => {
        this.store.dispatch(changeShowMenuAction(false));
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
