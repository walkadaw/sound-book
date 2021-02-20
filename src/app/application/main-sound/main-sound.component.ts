import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { filter, takeUntil, withLatestFrom } from 'rxjs/operators';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getShowMenu } from '../../redux/selector/settings.selector';

@Component({
  selector: 'app-main-sound',
  templateUrl: './main-sound.component.html',
  styleUrls: ['./main-sound.component.scss'],
})
export class MainSoundComponent implements OnInit, OnDestroy {
  showMenu$ = this.store.select(getShowMenu);
  private onDestroy$ = new Subject<void>();

  constructor(private store: Store<IAppState>, private router: Router) {}

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
