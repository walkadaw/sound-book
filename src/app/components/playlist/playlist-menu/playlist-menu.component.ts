import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { PlayList, PlaylistService } from 'src/app/services/playlist/playlist.service';

@Component({
  selector: 'app-playlist-menu',
  templateUrl: './playlist-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaylistMenuComponent {
  @Input() songId?: number;
  @Output() selectedPlaylist = new EventEmitter<PlayList>();

  playLists$: Observable<PlayList[]> = this.playlistService.playlists$;

  constructor(private playlistService: PlaylistService) {}
  
  clickOnPlayList(playlist: PlayList) {
    this.selectedPlaylist.emit(playlist);
  }
}
