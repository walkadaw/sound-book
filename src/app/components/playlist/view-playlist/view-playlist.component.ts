import { Clipboard } from '@angular/cdk/clipboard';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Song, SongFavorite } from '../../../interfaces/song';
import { IAppState } from '../../../redux/models/IAppState';
import { getShowChord, getShowSongNumber } from '../../../redux/selector/settings.selector';
import { PlayList, PlaylistService } from '../../../services/playlist/playlist.service';
import { SongService } from '../../../services/song-service/song.service';

@Component({
  selector: 'app-view-playlist',
  templateUrl: './view-playlist.component.html',
  styleUrls: ['./view-playlist.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewPlaylistComponent implements OnInit {
  playlistData$: Observable<PlayList & { songs: Song[] }>;

  showSongNumber$ = this.store.select(getShowSongNumber);
  showChord$ = this.store.select(getShowChord);

  canShare = !!navigator.share;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private songService: SongService,
    private store: Store<IAppState>,
    private playListService: PlaylistService,
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.playlistData$ = this.route.params.pipe(
      map(({ createdDate, songList = '', name }) => {
        const playlist = this.getCurrentPlaylist();

        if (!playlist && !songList) {
          this.router.navigate(['/404'], { skipLocationChange: true });
          return null;
        }

        return {
          ...playlist,
          name: playlist?.name || name,
          lastChange: playlist?.lastChange || createdDate,
          songList: playlist?.songList || songList.split(','),
          songs: this.getSongData(playlist?.songList || songList.split(',')),
        };
      }),
    );
  }

  getSongData(songList: string[]): Song[] {
    return songList.reduce((acc, idSong) => {
      if (this.songService.hasSong(idSong)) {
        acc.push(this.songService.getSong(idSong));
      }

      return acc;
    }, []);
  }

  trackBySong(index: number, item: SongFavorite): string {
    return `${item.id}-${item.favorite}`;
  }

  drop(event: CdkDragDrop<any>) {
    const playlist = this.getCurrentPlaylist();
    moveItemInArray(playlist.songList, event.previousIndex, event.currentIndex);

    this.updatePlaylist(playlist);
  }

  deleteSong(removedIndex: number) {
    const playlist = this.getCurrentPlaylist();
    playlist.songList = playlist.songList.filter((_, index) => index !== removedIndex);

    this.updatePlaylist(playlist);
  }

  copy(playlist: PlayList): void {
    const { dateCreate } = this.playListService.createPlaylist(playlist.name, playlist.songList);
    this.snackBar.open('Плэйліст скапіяваны', 'Зацынить', { duration: 2000 });
    this.router.navigate(['/playlist', 'edit', dateCreate]);
  }

  copyLink() {
    this.snackBar.open('Спасылка скапіявана', 'Зацынить', { duration: 2000 });
    this.clipboard.copy(window.location.toString());
  }

  deletePlaylist(playlist: PlayList) {
    if (window.confirm(`Вы сапраўды хочаце выдаліць плэйліст ${playlist.name}?`)) {
      this.playListService.deletePlayList(playlist.dateCreate);
      this.router.navigate(['/playlist']);
    }
  }

  async share(playlist: PlayList) {
    const shareData = {
      title: `Спеуник - ${playlist.name}`,
      text: `Мая падборка спяваў "${playlist.name}"`,
      url: window.location.toString(),
    };

    try {
      await navigator.share(shareData);
    } catch (err) {
      this.snackBar.open('Нешта пайшло не так', 'Зацынить', { duration: 2000 });
    }
  }

  private updatePlaylist(playlist: PlayList) {
    this.playListService.updatePlaylist(playlist);
    this.router.navigate(['..', playlist.songList.join(',')], { relativeTo: this.route, replaceUrl: true });
  }

  private getCurrentPlaylist(): PlayList {
    const playListId = this.route.snapshot.params.createdDate;
    return this.playListService.getPlaylist(playListId);
  }
}
