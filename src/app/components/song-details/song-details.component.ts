import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SongService } from '../../services/song-service/song.service';
import { combineLatest, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { TagNameById } from '../../interfaces/tag-list';
import { IAppState } from '../../redux/models/IAppState';
import { getChordPosition, getShowChord, getShowSongNumber } from '../../redux/selector/settings.selector';
import { Store } from '@ngrx/store';
import { getFavoriteState } from '../../redux/selector/favorite.selector';
import { toggleFavoriteAction } from '../../redux/actions/favorite.actions';
import { ChordPosition } from '../../redux/models/settings.state';

interface SelectedSong {
  id: number;
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
})
export class SongDetailsComponent implements OnInit {
  selectedSong$: Observable<SelectedSong>;
  isFavoriteSong$: Observable<boolean>;
  showSongNumber$ = this.store.select(getShowSongNumber);
  showChord$ = this.store.select(getShowChord);

  readonly tagNameById = TagNameById;

  constructor(private songService: SongService, private router: ActivatedRoute, private store: Store<IAppState>) {}

  ngOnInit(): void {
    this.selectedSong$ = combineLatest([
      this.router.paramMap.pipe(map((paramMap) => paramMap.get('id'))),
      this.store.select(getChordPosition),
    ]).pipe(
      map(([songId, chordPosition]) => {
        const song = this.songService.getSong(songId);

        if (chordPosition === 'inText') {
          const text = song.text.split('\n').map((value) => value.trim());
          const chord = song.chord.split('\n').map((value) => value.trim());
          return { ...song, text, chord, chordPosition };
        }

        return { ...song, chordPosition };
      })
    );

    this.isFavoriteSong$ = combineLatest([this.store.select(getFavoriteState), this.selectedSong$]).pipe(
      filter(([favorite, song]) => favorite && !!song),
      map(([favorite, song]) => favorite.has(song.id))
    );
  }

  isArray(arg: any): boolean {
    return Array.isArray(arg);
  }

  toggleFavorite(songID: number): void {
    this.store.dispatch(toggleFavoriteAction(songID));
  }
}
