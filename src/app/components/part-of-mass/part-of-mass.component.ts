import {
  ChangeDetectionStrategy, Component, OnInit,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, map, Observable } from 'rxjs';
import { IAppState } from '../../redux/models/IAppState';
import { getChordPosition, getShowChord } from '../../redux/selector/settings.selector';
import { SongService } from '../../services/song-service/song.service';
import { SelectedSong } from '../song-details/song-details.component';

const TAG_PAST_OF_MASS = 10;

@Component({
  selector: 'app-part-of-mass',
  templateUrl: './part-of-mass.component.html',
  styleUrls: ['./part-of-mass.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartOfMassComponent implements OnInit {
  showChord$ = this.store.select(getShowChord);
  songs$: Observable<SelectedSong[]>;

  constructor(
    private store: Store<IAppState>,
    private songService: SongService,
  ) {}

  ngOnInit(): void {
    this.songs$ = combineLatest([
      this.songService.songList$,
      this.store.select(getChordPosition),
    ]).pipe(
      map(([songs, chordPosition]) => songs.filter(
        (song) => song.tag && Object.keys(song.tag).some((tag) => TAG_PAST_OF_MASS === +tag),
      ).map((song) => {
        const text = song.text.split('\n').map((value) => value.trim());
        const chord = song.chord.split('\n').map((value) => value.trim());
        return {
          ...song, text, chord, chordPosition,
        };
      })),
    );
  }
}
