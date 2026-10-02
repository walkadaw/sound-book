import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { IAppState } from '../../redux/models/IAppState';
import { getShowChord } from '../../redux/selector/settings.selector';
import { PARTS_OF_MASS_TAG_ID } from '../../constants/tag-list';
import { displayRows, songStructure } from '../../services/chord/song-structure';
import { SongService } from '../../services/song-service/song.service';
import { SelectedSong } from '../song-details/song-details.component';
import { SongLyricsComponent } from '../song-lyrics/song-lyrics.component';

@Component({
  selector: 'app-part-of-mass',
  templateUrl: './part-of-mass.component.html',
  styleUrls: ['./part-of-mass.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SongLyricsComponent],
})
export class PartOfMassComponent {
  private store = inject<Store<IAppState>>(Store);
  private songService = inject(SongService);

  private songList = this.songService.songList;

  protected showChord = this.store.selectSignal(getShowChord);
  protected songs = computed<SelectedSong[]>(() =>
    this.songList()
      .filter((song) => song.tag && Object.keys(song.tag).some((tag) => PARTS_OF_MASS_TAG_ID === +tag))
      .map((song) => ({ ...song, rows: displayRows(songStructure(song)) })),
  );
}
