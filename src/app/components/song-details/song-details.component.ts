import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { AsyncPipe, KeyValuePipe } from '@angular/common';
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
import { LetDirective } from '../../directives/let-directive/app-let.directive';
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
    LetDirective,
    ChordListComponent,
    AsyncPipe,
    KeyValuePipe,
  ],
})
export class SongDetailsComponent implements OnInit {
  private songService = inject(SongService);
  private router = inject(ActivatedRoute);
  private store = inject<Store<IAppState>>(Store);
  private snackBar = inject(MatSnackBar);
  private playlistService = inject(PlaylistService);

  selectedSong$: Observable<SelectedSong>;
  isFavoriteSong$: Observable<boolean>;
  showSongNumber$ = this.store.select(getShowSongNumber);
  showChord$ = this.store.select(getShowChord);
  playLists: PlayList[] = this.playlistService.getAllPlaylists();
  selectedTranspilation = 0;

  readonly tagNameById = TagNameById;

  ngOnInit(): void {
    this.selectedSong$ = combineLatest([
      this.router.paramMap.pipe(map((paramMap) => paramMap.get('id'))),
      this.store.select(getChordPosition),
    ]).pipe(
      map(([songId, chordPosition]) => {
        const song = this.songService.getSong(songId);
        this.selectedTranspilation = 0;

        const text = song.text.split('\n').map((value) => value.trim());
        const chord = song.chord.split('\n').map((value) => value.trim());
        return {
          ...song,
          text,
          chord,
          chordPosition,
        };
      }),
    );

    this.isFavoriteSong$ = combineLatest([this.store.select(getFavoriteState), this.selectedSong$]).pipe(
      filter(([favorite, song]) => favorite && !!song),
      map(([favorite, song]) => favorite.has(song.id)),
    );
  }

  isArray(arg: any): boolean {
    return Array.isArray(arg);
  }

  toggleFavorite(songID: number): void {
    this.store.dispatch(toggleFavoriteAction(songID));
  }

  addedSongToPlaylist(idPlaylist: string, songId: number) {
    const playlist = this.playlistService.getPlaylist(idPlaylist);
    this.playlistService.addSongToPlaylist(idPlaylist, songId.toString());

    this.snackBar.open(`Песня дададзена ў плэйліст: ${playlist.name}`, 'Зачыніць', { duration: 2000 });
  }
}
