import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PlayList, PlaylistService } from '../../services/playlist/playlist.service';

@Component({
  selector: 'app-playlist',
  templateUrl: './playlist.component.html',
  styleUrls: ['./playlist.component.scss'],
  // TODO: рассмотреть переход на ChangeDetectionStrategy.OnPush (требует регресс-тестирования)
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
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
