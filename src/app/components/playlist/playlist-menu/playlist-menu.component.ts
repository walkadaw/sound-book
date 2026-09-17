import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PlayList, PlaylistService } from '../../../services/playlist/playlist.service';
import { UserService } from '../../../services/user/user.service';

@Component({
  selector: 'app-playlist-menu',
  templateUrl: './playlist-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PlaylistMenuComponent {
  private playlistService = inject(PlaylistService);
  private userService = inject(UserService);

  @Input() songId?: number;
  @Output() selectedPlaylist = new EventEmitter<PlayList>();

  SHOW_MAX_PLAYLIST = 8;

  playLists$: Observable<PlayList[]> = this.playlistService.playlists$;
  isAuth$: Observable<boolean> = this.userService.isAuth$;

  clickOnPlayList(playlist: PlayList) {
    this.selectedPlaylist.emit(playlist);
  }
}
