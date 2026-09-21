import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { IAppState } from '../../redux/models/IAppState';
import { getChordPosition, getShowChord } from '../../redux/selector/settings.selector';
import { SongService } from '../../services/song-service/song.service';
import { SelectedSong } from '../song-details/song-details.component';
import { ChordListComponent } from '../chord-list/chord-list.component';

const TAG_PAST_OF_MASS = 10;

@Component({
  selector: 'app-part-of-mass',
  templateUrl: './part-of-mass.component.html',
  styleUrls: ['./part-of-mass.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChordListComponent],
})
export class PartOfMassComponent {
  private store = inject<Store<IAppState>>(Store);
  private songService = inject(SongService);

  private songList = this.songService.songList;
  private chordPosition = this.store.selectSignal(getChordPosition);

  protected showChord = this.store.selectSignal(getShowChord);
  protected songs = computed<SelectedSong[]>(() => {
    const chordPosition = this.chordPosition();

    return this.songList()
      .filter((song) => song.tag && Object.keys(song.tag).some((tag) => TAG_PAST_OF_MASS === +tag))
      .map((song) => {
        const text = song.text.split('\n').map((value) => value.trim());
        const chord = song.chord.split('\n').map((value) => value.trim());
        return {
          ...song,
          text,
          chord,
          chordPosition,
        };
      });
  });
}
