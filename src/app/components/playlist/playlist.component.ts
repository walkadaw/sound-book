import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { PlayList, PlaylistService } from '../../services/playlist/playlist.service';

@Component({
  selector: 'app-playlist',
  templateUrl: './playlist.component.html',
  styleUrls: ['./playlist.component.scss'],
})
export class PlaylistComponent {
  playlists: PlayList[] = this.playlistService.playlists;

  constructor(
    private playlistService: PlaylistService,
  ) { }

  drop(event: CdkDragDrop<PlayList[]>) {
    moveItemInArray(this.playlists, event.previousIndex, event.currentIndex);

    this.playlistService.setAllPlaylist(this.playlists);
  }

  deletePlaylist(playlist: PlayList) {
    if (window.confirm(`Вы сапраўды хочаце выдаліць плэйліст: ${playlist.name}?`)) {
      this.playlistService.deletePlayList(playlist.dateCreate);
      this.playlists = this.playlistService.playlists;
    }
  }
}
