import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SongFavorite } from '../../interfaces/song';
import { toggleFavoriteAction } from '../../redux/actions/favorite.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { getShowSongNumber } from '../../redux/selector/settings.selector';
import { SongService } from '../../services/song-service/song.service';

@Component({
  selector: 'app-favorite',
  templateUrl: './favorite.component.html',
  styleUrls: ['./favorite.component.scss', '../main-page/main-page.component.scss'],
})
export class FavoriteComponent implements OnInit {
  songFavoriteList$: Observable<SongFavorite[]>;
  showSongNumber$ = this.store.select(getShowSongNumber);

  constructor(private songService: SongService, private store: Store<IAppState>) {}

  ngOnInit(): void {
    this.songFavoriteList$ = this.store
      .select(getFavoriteState)
      .pipe(map((favoriteList) => [...favoriteList].map((songId) => this.songService.getSong(songId))));
  }

  trackBySong(index: string, item: SongFavorite) {
    return item.id;
  }

  toggleFavorite(event: Event, songID: number): void {
    event.stopPropagation();
    this.store.dispatch(toggleFavoriteAction(songID));
  }
}
