import {
  Component,
  EffectRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { fromEvent } from 'rxjs';
import { debounceTime, filter, skip } from 'rxjs/operators';
import { Router, RouterLink, Scroll } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuContent } from '@angular/material/menu';
import { isPlatformBrowser } from '@angular/common';
import { SongFavorite } from '../../interfaces/song';
import { IAppState } from '../../redux/models/IAppState';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { getShowMenu } from '../../redux/selector/settings.selector';
import { FuseService, SongSearchResult } from '../../services/fuse-service/fuse.service';
import { PlaylistService } from '../../services/playlist/playlist.service';
import { SongService } from '../../services/song-service/song.service';
import { SongListService, resumesList } from '../../services/song-list/song-list.service';
import { PlaylistMenuComponent } from '../playlist/playlist-menu/playlist-menu.component';
import { ReplaceSpacePipe } from '../../pipes/replace-space/replace-space.pipe';
import { MatchHighlightComponent } from '../match-highlight/match-highlight.component';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
  imports: [
    RouterLink,
    MatIcon,
    MatIconButton,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    PlaylistMenuComponent,
    ReplaceSpacePipe,
    MatchHighlightComponent,
  ],
})
export class MainPageComponent {
  private fuseService = inject(FuseService);
  private songService = inject(SongService);
  private store = inject<Store<IAppState>>(Store);
  private playlistService = inject(PlaylistService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private injector = inject(Injector);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  private songList = inject(SongListService);

  protected openSongId = this.songList.openSongId;

  private showMenu = this.store.selectSignal(getShowMenu);
  private favoriteState = this.store.selectSignal(getFavoriteState);

  protected selectedTag = this.store.selectSignal(getSelectedTag);

  private searchTerm = this.store.selectSignal(getSearchTerm);
  private searchResults = this.fuseService.getSearchResults(
    this.selectedTag,
    this.searchTerm,
    this.songService.songList,
  );

  protected songListFiltered = computed<(SongFavorite & Omit<SongSearchResult, 'song'>)[]>(() => {
    const favoriteList = this.favoriteState();

    return this.searchResults().map(({ song, snippet }) => ({
      ...song,
      favorite: favoriteList.has(song.id),
      snippet,
    }));
  });

  private waitForSongs?: EffectRef;
  private menuScrollYPosition = 0;

  constructor() {
    // Scroll position bookkeeping only; the prerendered page has nothing to scroll.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }

    effect(() => {
      this.selectedTag();
      this.searchTerm();

      untracked(() => {
        if (this.songList.takeChangedByHistory()) {
          return;
        }

        this.menuScrollYPosition = 0;

        if (this.showMenu()) {
          window.scrollTo(0, 0);
        }
      });
    });

    this.store
      .select(getShowMenu)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe((showMenu) => {
        const navigation = this.router.currentNavigation();

        if (!showMenu || navigation?.extras.scroll !== 'manual') {
          return;
        }

        const resumed = resumesList(navigation.extras.state);
        afterNextRender(() => (resumed ? this.scrollListIntoPlace() : window.scrollTo(0, 0)), {
          injector: this.injector,
        });
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof Scroll),
        filter((event) => !event.position && event.scrollBehavior !== 'manual'),
        filter(() => this.showMenu() && this.openSongId() !== null && this.songList.resumed()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.revealOpenSongWhenListed());

    this.initScrollListener();
  }

  private revealOpenSongWhenListed(): void {
    this.waitForSongs?.destroy();

    const ref = effect(
      () => {
        if (this.songService.songList().length) {
          ref.destroy();
          afterNextRender(() => this.revealOpenSong(), { injector: this.injector });
        }
      },
      { injector: this.injector },
    );

    this.waitForSongs = ref;
  }

  private scrollListIntoPlace(): void {
    window.scrollTo(0, this.menuScrollYPosition);
    this.revealOpenSong();
  }

  private revealOpenSong(): void {
    const openSong = this.host.nativeElement.querySelector('.song-container.active');

    if (openSong && !isInView(openSong)) {
      openSong.scrollIntoView({ block: 'center' });
    }
  }

  resetSelectedTag() {
    this.songList.resetTag();
  }

  initScrollListener() {
    fromEvent(window, 'scroll')
      .pipe(
        filter(() => this.showMenu()),
        debounceTime(50),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuScrollYPosition = window.scrollY;
      });
  }

  addedSongToPlaylist(idPlaylist: string, songId: number) {
    const playlist = this.playlistService.getPlaylist(idPlaylist);
    this.playlistService.addSongToPlaylist(idPlaylist, songId.toString());

    this.snackBar.open(`Песня дададзена ў плэйліст: ${playlist.name}`, 'Зачыніць', { duration: 2000 });
  }
}

function isInView(element: Element): boolean {
  const { top, bottom } = element.getBoundingClientRect();

  return top >= window.innerHeight * 0.25 && bottom <= window.innerHeight;
}
