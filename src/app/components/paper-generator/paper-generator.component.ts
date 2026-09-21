import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Validators, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatCheckboxChange, MatCheckbox } from '@angular/material/checkbox';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll, CdkVirtualForOf } from '@angular/cdk/scrolling';
import { AsyncPipe } from '@angular/common';
import { TAGS_LIST } from '../../constants/tag-list';
import { GeneratorService } from '../../services/generator-service/generator.service';
import { FuseService } from '../../services/fuse-service/fuse.service';
import { Song } from '../../interfaces/song';
import { SongService } from '../../services/song-service/song.service';

@Component({
  selector: 'app-paper-generator',
  templateUrl: './paper-generator.component.html',
  styleUrls: ['./paper-generator.component.scss'],
  // TODO: рассмотреть переход на ChangeDetectionStrategy.OnPush (требует регресс-тестирования)
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ReactiveFormsModule,
    MatRadioGroup,
    MatRadioButton,
    MatCheckbox,
    MatIcon,
    MatTooltip,
    MatFormField,
    MatLabel,
    MatInput,
    MatIconButton,
    MatSuffix,
    MatTabGroup,
    MatTab,
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    MatButton,
    AsyncPipe,
  ],
})
export class PaperGeneratorComponent implements OnInit {
  private formBuilder = inject(NonNullableFormBuilder);
  private songService = inject(SongService);
  private fuseService = inject(FuseService);
  private generatorService = inject(GeneratorService);

  songListForm = this.formBuilder.group({
    allSong: [true, Validators.required],
    selectedSong: this.formBuilder.control<Record<string, boolean>>({}),
    isShowChord: [true],
    isShowTag: [true],
    isAddChastki: [false],
    isAddGadzinki: [false],
    search: '',
    selectedTabId: 0,
  });

  songListFiltered$: Observable<Song[]>;
  selectedSongList$: Observable<Song[]>;

  ngOnInit() {
    const { search, selectedSong } = this.songListForm.controls;
    this.songListFiltered$ = this.fuseService.getFilteredSong(
      of(0),
      search.valueChanges.pipe(startWith(search.value)),
      this.songService.songList$,
    );

    this.selectedSongList$ = selectedSong.valueChanges.pipe(
      startWith(selectedSong.value),
      map((selected) =>
        Object.entries(selected)
          .filter(([, value]) => value)
          .map(([key]) => this.songService.getSong(key)),
      ),
    );
  }

  selectedIndexChange(value: number): void {
    this.songListForm.controls.selectedTabId.setValue(value);
  }

  changeSelectedSong(event: MatCheckboxChange, songId: number): void {
    const { selectedSong } = this.songListForm.controls;
    selectedSong.setValue({ ...selectedSong.value, [songId]: event.checked });
  }

  clearFilterSong() {
    this.songListForm.controls.search.setValue('');
  }

  trackBy(index: number, song: Song): number {
    return song.id;
  }

  generateDocx() {
    const { allSong, selectedSong, isShowChord, isShowTag, isAddChastki, isAddGadzinki } =
      this.songListForm.getRawValue();

    let songList = this.songService.songList$.value.filter((song) => !song.tag[TAGS_LIST[9].id]).map(({ id }) => +id);
    if (!allSong) {
      songList = Object.keys(selectedSong)
        .filter((key) => selectedSong[key] && this.songService.hasSong(key))
        .map((key) => +key);
    }

    this.generatorService.getDocX(songList, {
      isShowChord,
      isShowTag,
      isAddChastki,
      isAddGadzinki,
    });
  }
}
