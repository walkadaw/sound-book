import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PlaylistService } from 'src/app/services/playlist/playlist.service';
import { SongFavorite } from '../../interfaces/song';
import { toggleFavoriteAction } from '../../redux/actions/favorite.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { getShowSongNumber } from '../../redux/selector/settings.selector';
import { SongService } from '../../services/song-service/song.service';

@Component({
  selector: 'app-favorite',
  templateUrl: './favorite.component.html',
  styleUrls: ['./favorite.component.scss'],
})
export class FavoriteComponent implements OnInit {
  songFavoriteList$: Observable<SongFavorite[]>;
  showSongNumber$ = this.store.select(getShowSongNumber);

  constructor(
    private songService: SongService, 
    private store: Store<IAppState>,
    private snackBar: MatSnackBar,
    private playlistService: PlaylistService,
  ) {}

  ngOnInit(): void {
    this.songFavoriteList$ = this.store
      .select(getFavoriteState)
      .pipe(map((favoriteList) => [...favoriteList].map((songId) => this.songService.getSong(songId))));
  }

  trackBySong(index: number, item: SongFavorite): number {
    return item.id;
  }

  toggleFavorite(event: Event, songID: number): void {
    event.stopPropagation();
    this.store.dispatch(toggleFavoriteAction(songID));
  }

  addedSongToPlaylist(idPlaylist: string, songId: number) {
    const playlist = this.playlistService.getPlaylist(idPlaylist);
    this.playlistService.addSongToPlaylist(idPlaylist, songId.toString());

    this.snackBar.open(`Песня дададзена ў плэйліст: ${playlist.name}`, 'Зачыніць', { duration: 2000 });
  }
}
