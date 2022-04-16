import { Component, OnInit } from '@angular/core';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { SongService } from '../../services/song-service/song.service';
import { Song } from '../../interfaces/song';
import { FuseService } from '../../services/fuse-service/fuse.service';

@Component({
  selector: 'app-paper-generator',
  templateUrl: './paper-generator.component.html',
  styleUrls: ['./paper-generator.component.scss'],
})
export class PaperGeneratorComponent implements OnInit {
  songListForm: FormGroup;
  songListFiltered$: Observable<Song[]>;
  selectedSongList$: Observable<Song[]>;

  constructor(private formBuilder: FormBuilder, private songService: SongService, private fuseService: FuseService) {}

  ngOnInit() {
    this.songListForm = this.formBuilder.group({
      allSong: [true, Validators.required],
      selectedSong: {},
      chord: [true],
      showTag: [true],
      chastki: [false],
      gadzinki: [false],
      search: '',
      selectedTabId: 0,
    });

    const search = this.songListForm.get('search');
    this.songListFiltered$ = this.fuseService.getFilteredSong(
      of(0),
      search.valueChanges.pipe(startWith(search.value)),
      this.songService.songList,
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
}
