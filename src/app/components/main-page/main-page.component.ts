import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { fromEvent } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { RouterLinkActive, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuContent } from '@angular/material/menu';
import { UpperCasePipe } from '@angular/common';
import { SongFavorite } from '../../interfaces/song';
import { setSelectedTagAction } from '../../redux/actions/search.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { getShowMenu, getShowSongNumber } from '../../redux/selector/settings.selector';
import { FuseService, SongSearchResult } from '../../services/fuse-service/fuse.service';
import { PlaylistService } from '../../services/playlist/playlist.service';
import { SongService } from '../../services/song-service/song.service';
import { PlaylistMenuComponent } from '../playlist/playlist-menu/playlist-menu.component';
import { ReplaceSpacePipe } from '../../pipes/replace-space/replace-space.pipe';
import { MatchHighlightComponent } from '../match-highlight/match-highlight.component';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLinkActive,
    RouterLink,
    MatIcon,
    MatIconButton,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    PlaylistMenuComponent,
    UpperCasePipe,
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

  private showMenu = this.store.selectSignal(getShowMenu);
  private favoriteState = this.store.selectSignal(getFavoriteState);

  protected showSongNumber = this.store.selectSignal(getShowSongNumber);
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

  private menuScrollYPosition: number;
  private contentScrollYPosition: number;

  constructor() {
    effect(() => {
      this.searchResults();
      window.scrollTo(0, 0);
    });

    this.store
      .select(getShowMenu)
      .pipe(debounceTime(0), takeUntilDestroyed())
      .subscribe((showMenu) => {
        if (showMenu && this.menuScrollYPosition) {
          this.contentScrollYPosition = window.scrollY;
          window.scrollTo(0, this.menuScrollYPosition);
        } else if (this.contentScrollYPosition) {
          window.scrollTo(0, this.contentScrollYPosition);
        }
      });

    this.initScrollListener();
  }

  resetSelectedTag(event: MouseEvent) {
    event.preventDefault();
    this.store.dispatch(setSelectedTagAction(0));
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
