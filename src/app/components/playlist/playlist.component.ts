import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { PlayList, PlaylistService } from '../../services/playlist/playlist.service';

@Component({
  selector: 'app-playlist',
  templateUrl: './playlist.component.html',
  styleUrls: ['./playlist.component.scss'],
  imports: [CdkDropList, CdkDrag, RouterLink, MatIconButton, CdkDragHandle, MatIcon, DatePipe],
})
export class PlaylistComponent {
  private playlistService = inject(PlaylistService);

  protected playlists = this.playlistService.playlists;

  drop(event: CdkDragDrop<PlayList[]>) {
    // signal only notifies on a new reference, so reorder a copy
    const playlists = [...this.playlists()];
    moveItemInArray(playlists, event.previousIndex, event.currentIndex);

    this.playlistService.setAllPlaylist(playlists);
  }

  deletePlaylist(playlist: PlayList) {
    if (window.confirm(`Вы сапраўды хочаце выдаліць плэйліст: ${playlist.name}?`)) {
      this.playlistService.deletePlayList(playlist.dateCreate);
    }
  }
}
