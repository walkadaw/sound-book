import { Component, computed, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { toggleFavoriteAction } from '../../redux/actions/favorite.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { getShowSongNumber } from '../../redux/selector/settings.selector';
import { PlaylistService } from '../../services/playlist/playlist.service';
import { SongService } from '../../services/song-service/song.service';
import { PlaylistMenuComponent } from '../playlist/playlist-menu/playlist-menu.component';
import { ReplaceSpacePipe } from '../../pipes/replace-space/replace-space.pipe';

@Component({
  selector: 'app-favorite',
  templateUrl: './favorite.component.html',
  styleUrls: ['./favorite.component.scss'],
  imports: [RouterLink, MatIcon, MatIconButton, MatMenuTrigger, MatMenu, PlaylistMenuComponent, ReplaceSpacePipe],
})
export class FavoriteComponent {
  private songService = inject(SongService);
  private store = inject<Store<IAppState>>(Store);
  private snackBar = inject(MatSnackBar);
  private playlistService = inject(PlaylistService);

  private favoriteState = this.store.selectSignal(getFavoriteState);

  protected showSongNumber = this.store.selectSignal(getShowSongNumber);
  protected songFavoriteList = computed(() =>
    [...this.favoriteState()].map((songId) => this.songService.getSong(songId)),
  );

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
