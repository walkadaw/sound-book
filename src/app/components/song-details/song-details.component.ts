import { Component, ChangeDetectionStrategy, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { map } from 'rxjs/operators';
import { SongService } from '../../services/song-service/song.service';
import { TagNameById } from '../../interfaces/tag-list';
import { IAppState } from '../../redux/models/IAppState';
import { getChordPosition, getShowChord, getShowSongNumber } from '../../redux/selector/settings.selector';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { toggleFavoriteAction } from '../../redux/actions/favorite.actions';
import { ChordPosition } from '../../redux/models/settings.state';
import { PlayList, PlaylistService } from '../../services/playlist/playlist.service';
import { PlaylistMenuComponent } from '../playlist/playlist-menu/playlist-menu.component';
import { SongKeyComponent } from '../song-key/song-key.component';
import { ChordListComponent } from '../chord-list/chord-list.component';

export interface SelectedSong {
  id: number;
  songId: number;
  title: string;
  text: string | string[];
  chord: string | string[];
  tag: { [key: string]: number };
  chordPosition: ChordPosition;
}

@Component({
  selector: 'app-song-details',
  templateUrl: './song-details.component.html',
  styleUrls: ['./song-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconButton,
    MatIcon,
    MatMenuTrigger,
    MatMenu,
    PlaylistMenuComponent,
    SongKeyComponent,
    ChordListComponent,
  ],
})
export class SongDetailsComponent {
  private songService = inject(SongService);
  private route = inject(ActivatedRoute);
  private store = inject<Store<IAppState>>(Store);
  private snackBar = inject(MatSnackBar);
  private playlistService = inject(PlaylistService);

  private songId = toSignal(this.route.paramMap.pipe(map((paramMap) => paramMap.get('id'))), { requireSync: true });
  private chordPosition = this.store.selectSignal(getChordPosition);
  private favoriteState = this.store.selectSignal(getFavoriteState);

  protected selectedSong = computed<SelectedSong | null>(() => {
    const song = this.songService.getSong(this.songId());

    if (!song) {
      return null;
    }

    const text = song.text.split('\n').map((value) => value.trim());
    const chord = song.chord.split('\n').map((value) => value.trim());
    return {
      ...song,
      text,
      chord,
      chordPosition: this.chordPosition(),
    };
  });

  protected isFavoriteSong = computed(() => this.favoriteState().has(this.selectedSong()?.id));
  protected tagNames = computed(() => {
    const tag = this.selectedSong()?.tag;

    if (!tag || Array.isArray(tag)) {
      return '';
    }

    return Object.keys(tag)
      .map((key) => this.tagNameById[key])
      .join(', ');
  });
  protected showSongNumber = this.store.selectSignal(getShowSongNumber);
  protected showChord = this.store.selectSignal(getShowChord);
  protected selectedTranspilation = linkedSignal({ source: this.songId, computation: () => 0 });

  playLists: PlayList[] = this.playlistService.getAllPlaylists();

  readonly tagNameById = TagNameById;

  toggleFavorite(songID: number): void {
    this.store.dispatch(toggleFavoriteAction(songID));
  }

  addedSongToPlaylist(idPlaylist: string, songId: number) {
    const playlist = this.playlistService.getPlaylist(idPlaylist);
    this.playlistService.addSongToPlaylist(idPlaylist, songId.toString());

    this.snackBar.open(`Песня дададзена ў плэйліст: ${playlist.name}`, 'Зачыніць', { duration: 2000 });
  }
}
