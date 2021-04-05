import { Component, OnInit, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { SongFavorite } from '../../interfaces/song';
import { combineLatest, Observable, Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import { IAppState } from '../../redux/models/IAppState';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { FuseService } from '../../services/fuse-service/fuse.service';
import { SongService } from '../../services/song-service/song.service';
import { getShowMenu, getShowSongNumber } from '../../redux/selector/settings.selector';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { debounceTime, map, takeUntil } from 'rxjs/operators';
import { setSelectedTagAction } from '../../redux/actions/search.actions';

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

  constructor(private fuseService: FuseService, private songService: SongService, private store: Store<IAppState>) {}

  ngOnInit(): void {
    const filteredSong$ = this.fuseService.getFilteredSong(
      this.selectedTag$,
      this.store.select(getSearchTerm),
      this.songService.songList
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

  trackBySong(index: string, item: SongFavorite) {
    return `${item.id}-${item.favorite}`;
  }

  onClick() {
    this.menuScrollYPosition = window.scrollY;
  }
}
