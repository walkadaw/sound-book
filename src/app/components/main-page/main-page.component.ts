import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, Subject } from 'rxjs';
import { debounceTime, map, takeUntil } from 'rxjs/operators';
import { PlaylistService } from 'src/app/services/playlist/playlist.service';
import { SongFavorite } from '../../interfaces/song';
import { setSelectedTagAction } from '../../redux/actions/search.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { getShowMenu, getShowSongNumber } from '../../redux/selector/settings.selector';
import { FuseService } from '../../services/fuse-service/fuse.service';
import { SongService } from '../../services/song-service/song.service';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPageComponent implements OnInit, OnDestroy {
  songListFiltered$: Observable<SongFavorite[]>;
  showSongNumber$ = this.store.select(getShowSongNumber);
  selectedTag$ = this.store.select(getSelectedTag);

  private menuScrollYPosition: number;
  private contentScrollYPosition: number;
  private onDestroy$ = new Subject<void>();

  constructor(
    private fuseService: FuseService,
    private songService: SongService,
    private store: Store<IAppState>,
    private playlistService: PlaylistService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const filteredSong$ = this.fuseService.getFilteredSong(
      this.selectedTag$,
      this.store.select(getSearchTerm),
      this.songService.songList,
    );

    this.songListFiltered$ = combineLatest([filteredSong$, this.store.select(getFavoriteState)]).pipe(
      map(([songs, favoriteList]) => songs.map((song) => ({ ...song, favorite: favoriteList.has(song.id) })))
    );

    filteredSong$.pipe(takeUntil(this.onDestroy$)).subscribe(() => window.scrollTo(0, 0));

    this.store
      .select(getShowMenu)
      .pipe(debounceTime(0), takeUntil(this.onDestroy$))
      .subscribe((showMenu) => {
        if (showMenu && this.menuScrollYPosition) {
          this.contentScrollYPosition = window.scrollY;
          window.scrollTo(0, this.menuScrollYPosition);
        } else if (this.contentScrollYPosition) {
          window.scrollTo(0, this.contentScrollYPosition);
        }
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  resetSelectedTag(event: MouseEvent) {
    event.preventDefault();
    this.store.dispatch(setSelectedTagAction(0));
  }

  trackBySong(index: number, item: SongFavorite): string {
    return `${item.id}-${item.favorite}`;
  }

  onClick() {
    this.menuScrollYPosition = window.scrollY;
  }

  addedSongToPlaylist(idPlaylist: string, songId: number) {
    const playlist = this.playlistService.getPlaylist(idPlaylist);
    this.playlistService.addSongToPlaylist(idPlaylist, songId.toString());

    this.snackBar.open(`Песня дададзена ў плэйліст: ${playlist.name}`, 'Зачыніць', { duration: 2000 });
  }

}
