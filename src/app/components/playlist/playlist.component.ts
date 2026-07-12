import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PlayList, PlaylistService } from '../../services/playlist/playlist.service';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-playlist',
  templateUrl: './playlist.component.html',
  styleUrls: ['./playlist.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CdkDropList, CdkDrag, RouterLink, MatIconButton, CdkDragHandle, MatIcon, DatePipe],
})
export class PlaylistComponent {
  private playlistService = inject(PlaylistService);

  playlists: PlayList[] = this.playlistService.playlists;

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
