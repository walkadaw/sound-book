import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, Output,
} from '@angular/core';
import { Observable } from 'rxjs';
import { PlayList, PlaylistService } from '../../../services/playlist/playlist.service';
import { UserService } from '../../../services/user/user.service';

@Component({
  selector: 'app-playlist-menu',
  templateUrl: './playlist-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaylistMenuComponent {
  @Input() songId?: number;
  @Output() selectedPlaylist = new EventEmitter<PlayList>();

  SHOW_MAX_PLAYLIST = 8;

  playLists$: Observable<PlayList[]> = this.playlistService.playlists$;
  isAuth$: Observable<boolean> = this.userService.isAuth$;

  constructor(
    private playlistService: PlaylistService,
    private userService: UserService,
  ) {}

  clickOnPlayList(playlist: PlayList) {
    this.selectedPlaylist.emit(playlist);
  }
}
