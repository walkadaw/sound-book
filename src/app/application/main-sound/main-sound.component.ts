import { Component, DOCUMENT, ElementRef, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { fromEvent } from 'rxjs';
import { filter, skip } from 'rxjs/operators';
import { IAppState } from '../../redux/models/IAppState';
import { getFontSize, getShowMenu } from '../../redux/selector/settings.selector';
import { HeaderComponent } from '../../components/header/header.component';
import { MainPageComponent } from '../../components/main-page/main-page.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { SongListService } from '../../services/song-list/song-list.service';

// Scrolling less than this either way leaves the header as it is, so a shaky hand does not make it flicker.
const HEADER_SCROLL_THRESHOLD_PX = 12;
// Near the top of the page the header always shows: it is part of the page there, not covering anything.
const HEADER_ALWAYS_SHOWN_PX = 120;

@Component({
  selector: 'app-main-sound',
  templateUrl: './main-sound.component.html',
  styleUrls: ['./main-sound.component.scss'],
  imports: [HeaderComponent, MainPageComponent, RouterOutlet, FooterComponent],
  host: {
    '(document:keydown.escape)': 'closeSongList($event)',
  },
})
export class MainSoundComponent {
  private store = inject<Store<IAppState>>(Store);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private songList = inject(SongListService);

  private main = viewChild.required<ElementRef<HTMLElement>>('main');

  protected showMenu = this.store.selectSignal(getShowMenu);

  protected fontSize = this.store.selectSignal(getFontSize);
  // The closed menu lists every song; prerendering it would add ~600 KB of duplicate markup to each song page.
  protected renderMenu = computed(() => this.isBrowser || this.showMenu());
  // The song list keeps its search in view; on the other pages the header gives the screen back to the text.
  private scrolledDown = signal(false);
  protected headerHidden = computed(() => this.scrolledDown() && !this.showMenu());

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.moveFocusAfterNavigation());

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.scrolledDown.set(false));

    if (this.isBrowser) {
      this.hideHeaderOnScroll();
    }
  }

  // Hides the header while the page scrolls down and brings it back on any scroll up.
  private hideHeaderOnScroll(): void {
    let lastY = window.scrollY;

    fromEvent(window, 'scroll', { passive: true })
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const y = window.scrollY;

        if (y <= HEADER_ALWAYS_SHOWN_PX) {
          this.scrolledDown.set(false);
        } else if (Math.abs(y - lastY) < HEADER_SCROLL_THRESHOLD_PX) {
          // small moves add up until they pass the threshold
          return;
        } else {
          this.scrolledDown.set(y > lastY);
        }

        lastY = y;
      });
  }

  protected closeSongList(event: Event): void {
    if (!event.defaultPrevented) {
      this.songList.close();
    }
  }

  protected focusMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  // The link that triggered the navigation is usually destroyed with the old view, which drops
  // keyboard and screen reader focus back to <body>; the search field is left alone while typing.
  private moveFocusAfterNavigation(): void {
    if (this.document.activeElement?.closest('app-song-search')) {
      return;
    }

    this.main().nativeElement.focus({ preventScroll: true });
  }
}
