import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, startWith } from 'rxjs/operators';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFontSize, getShowMenu } from '../../redux/selector/settings.selector';
import { HeaderComponent } from '../../components/header/header.component';
import { MainPageComponent } from '../../components/main-page/main-page.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-main-sound',
  templateUrl: './main-sound.component.html',
  styleUrls: ['./main-sound.component.scss'],
  imports: [HeaderComponent, MainPageComponent, RouterOutlet, FooterComponent],
})
export class MainSoundComponent {
  private store = inject<Store<IAppState>>(Store);
  private router = inject(Router);

  private navigate$ = this.router.events.pipe(filter((event) => event instanceof NavigationStart));
  private isMenuOpen = this.store.selectSignal(getShowMenu);
  private isRootUrl = toSignal(
    this.navigate$.pipe(
      map((value) => value.url),
      startWith(window.location.pathname),
      map((url) => url === '/'),
    ),
    { requireSync: true },
  );

  protected fontSize = this.store.selectSignal(getFontSize);
  protected showMenu = computed(() => this.isMenuOpen() || this.isRootUrl());

  constructor() {
    this.navigate$
      .pipe(
        filter(() => this.isMenuOpen()),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.store.dispatch(changeShowMenuAction(false));
      });
  }
}
