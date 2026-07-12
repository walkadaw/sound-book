import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, Subject } from 'rxjs';
import {
  filter, map, startWith, takeUntil, withLatestFrom,
} from 'rxjs/operators';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFontSize, getShowMenu } from '../../redux/selector/settings.selector';
import { FooterComponent } from '../../components/footer/footer.component';
import { AsyncPipe } from '@angular/common';
import { MainPageComponent } from '../../components/main-page/main-page.component';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
    selector: 'app-main-sound',
    templateUrl: './main-sound.component.html',
    styleUrls: ['./main-sound.component.scss'],
    standalone: true,
    imports: [
    HeaderComponent,
    MainPageComponent,
    RouterOutlet,
    FooterComponent,
    AsyncPipe
],
})
export class MainSoundComponent implements OnInit, OnDestroy {
  private store = inject<Store<IAppState>>(Store);
  private router = inject(Router);

  showMenu$: Observable<boolean>;
  fontSize$ = this.store.select(getFontSize);

  private onDestroy$ = new Subject<void>();

  // @HostListener('swipeleft')
  // swipeLeft() {
  //   this.store.dispatch(changeShowMenuAction(false));
  // }

  // @HostListener('swiperight')
  // swipeRight() {
  //   this.store.dispatch(changeShowMenuAction(true));
  // }

  ngOnInit() {
    const navigate$ = this.router.events.pipe(filter((event) => event instanceof NavigationStart), map((s) => s));
    navigate$
      .pipe(
        withLatestFrom(this.store.select(getShowMenu)),
        filter(([, showMenu]) => showMenu),
        takeUntil(this.onDestroy$),
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
        map((url) => url === '/'),
      ),
    ]).pipe(map(([showMenu, rootUrl]) => showMenu || rootUrl));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
