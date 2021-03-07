import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SongFavorite } from '../../interfaces/song';
import { combineLatest, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { IAppState } from '../../redux/models/IAppState';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { FuseService } from '../../services/fuse-service/fuse.service';
import { SongService } from '../../services/song-service/song.service';
import { getShowSongNumber } from '../../redux/selector/settings.selector';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { map } from 'rxjs/operators';
import { setSelectedTagAction } from '../../redux/actions/search.actions';

@Component({
  selector: 'app-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPageComponent implements OnInit {
  songListFiltered$: Observable<SongFavorite[]>;
  showSongNumber$ = this.store.select(getShowSongNumber);
  selectedTag$ = this.store.select(getSelectedTag);

  constructor(private fuseService: FuseService, private songService: SongService, private store: Store<IAppState>) {}

  ngOnInit(): void {
    this.songListFiltered$ = combineLatest([
      this.fuseService.getFilteredSong(this.selectedTag$, this.store.select(getSearchTerm), this.songService.songList),
      this.store.select(getFavoriteState),
    ]).pipe(map(([songs, favoriteList]) => songs.map((song) => ({ ...song, favorite: favoriteList.has(song.id) }))));
  }

  resetSelectedTag(event: MouseEvent) {
    event.preventDefault();
    this.store.dispatch(setSelectedTagAction(0));
  }

  trackBySong(index: string, item: SongFavorite) {
    return `${item.id}-${item.favorite}`;
  }
}
