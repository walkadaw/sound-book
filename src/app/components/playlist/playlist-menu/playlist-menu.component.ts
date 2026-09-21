import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatMenuItem } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { SlicePipe } from '@angular/common';
import { UserService } from '../../../services/user/user.service';
import { PlayList, PlaylistService } from '../../../services/playlist/playlist.service';

@Component({
  selector: 'app-playlist-menu',
  templateUrl: './playlist-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatMenuItem, RouterLink, MatIcon, MatDivider, SlicePipe],
})
export class PlaylistMenuComponent {
  private playlistService = inject(PlaylistService);
  private userService = inject(UserService);

  readonly songId = input<number>();
  readonly selectedPlaylist = output<PlayList>();

  SHOW_MAX_PLAYLIST = 8;

  protected playLists = this.playlistService.playlists;
  protected isAuth = this.userService.isAuth;

  clickOnPlayList(playlist: PlayList) {
    this.selectedPlaylist.emit(playlist);
  }
}
