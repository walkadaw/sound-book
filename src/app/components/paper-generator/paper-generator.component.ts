import { Component, OnInit } from '@angular/core';
import { Validators, UntypedFormBuilder, UntypedFormGroup, ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatCheckboxChange, MatCheckbox } from '@angular/material/checkbox';
import { SongService } from '../../services/song-service/song.service';
import { Song } from '../../interfaces/song';
import { FuseService } from '../../services/fuse-service/fuse.service';
import { GeneratorService } from '../../services/generator-service/generator.service';
import { TAGS_LIST } from '../../constants/tag-list';
import { CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll, CdkVirtualForOf } from '@angular/cdk/scrolling';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { NgIf, AsyncPipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';

@Component({
    selector: 'app-paper-generator',
    templateUrl: './paper-generator.component.html',
    styleUrls: ['./paper-generator.component.scss'],
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatRadioGroup,
        MatRadioButton,
        MatCheckbox,
        MatIcon,
        MatTooltip,
        NgIf,
        MatFormField,
        MatLabel,
        MatInput,
        MatButton,
        MatIconButton,
        MatSuffix,
        MatTabGroup,
        MatTab,
        CdkVirtualScrollViewport,
        CdkFixedSizeVirtualScroll,
        CdkVirtualForOf,
        AsyncPipe,
    ],
})
export class PaperGeneratorComponent implements OnInit {
  songListForm: UntypedFormGroup;
  songListFiltered$: Observable<Song[]>;
  selectedSongList$: Observable<Song[]>;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private songService: SongService,
    private fuseService: FuseService,
    private generatorService: GeneratorService,
  ) {}

  ngOnInit() {
    this.songListForm = this.formBuilder.group({
      allSong: [true, Validators.required],
      selectedSong: {},
      isShowChord: [true],
      isShowTag: [true],
      isAddChastki: [false],
      isAddGadzinki: [false],
      search: '',
      selectedTabId: 0,
    });

    const search = this.songListForm.get('search');
    this.songListFiltered$ = this.fuseService.getFilteredSong(
      of(0),
      search.valueChanges.pipe(startWith(search.value)),
      this.songService.songList$,
    );

    this.selectedSongList$ = this.songListForm.get('selectedSong').valueChanges.pipe(
      startWith(this.songListForm.get('selectedSong').value),
      map((selectedSong) => Object.entries(selectedSong)
        .filter(([, value]) => value)
        .map(([key]) => this.songService.getSong(key))),
    );
  }

  selectedIndexChange(value: number): void {
    this.songListForm.get('selectedTabId').setValue(value);
  }

  changeSelectedSong(event: MatCheckboxChange, songId: number): void {
    const selectedSong = this.songListForm.get('selectedSong');
    selectedSong.setValue({ ...selectedSong.value, [songId]: event.checked });
  }

  clearFilterSong() {
    this.songListForm.get('search').setValue('');
  }

  trackBy(index: number, song: Song): number {
    return song.id;
  }

  generateDocx() {
    const {
      allSong,
      selectedSong,
      isShowChord,
      isShowTag,
      isAddChastki,
      isAddGadzinki,
    } = this.songListForm.value;

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
