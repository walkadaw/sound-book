import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Change, diffWords } from 'diff';
import {
  pluck, Subject, takeUntil,
} from 'rxjs';
import {
  filter,
} from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TagList, TAGS_LIST } from '../../../constants/tag-list';
import { Song, SongAdd } from '../../../interfaces/song';
import { ChordService } from '../../../services/chord/chord.service';
import { SongService } from '../../../services/song-service/song.service';
import { DuplicateService } from '../../../services/duplicate/duplicate.service';
import { SimilarSongDialogComponent } from '../../similar-song-dialog copy/similar-song-dialog.component';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss'],
})
export class EditComponent implements OnInit, OnDestroy {
  readonly tagList = TAGS_LIST;

  songDataForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    text: new FormControl('', Validators.required),
    tags: new FormGroup(this.setTag(() => new FormControl(false))),
  });

  diff: Change[];
  private onDestroy$ = new Subject<void>();

  get songID(): number {
    return +this.route.snapshot.params.id;
  }

  constructor(
    private songService: SongService,
    private chordService: ChordService,
    private route: ActivatedRoute,
    private router: Router,
    private duplicateService: DuplicateService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.initLoadData();
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onSave() {
    const {
      title, text, tags,
    } = this.songDataForm.value;

    const { songID } = this;
    const content = this.chordService.getTextAndChord(text);

    if (songID) {
      const songff = this.songService.getSong(songID);
      // TODO we heead it?
      this.diff = diffWords(this.mergeChordWidthText(songff), this.mergeChordWidthText(content as Song));
    }

    const song: SongAdd = {
      id: songID,
      title: title.trim(),
      text: content.text.trimRight(),
      chord: content.chord.trimRight(),
      tag: Object.keys(tags).filter((key) => tags[key]).join(','),
    };

    const duplication = this.songService.songList$.value.filter(
      (originSong) => +originSong.id !== +song.id && this.duplicateService.isSimilar(originSong.text, song.text),
    );

    if (duplication.length) {
      this.dialog.open(SimilarSongDialogComponent, { data: { song, duplication } })
        .afterClosed().pipe(filter((newSong) => !!newSong)).subscribe((newSong) => {
          this.saveSong(newSong);
        });
      return;
    }

    this.saveSong(song);
  }

  private saveSong(song: SongAdd): void {
    this.songService.updateSong(song).pipe(takeUntil(this.onDestroy$)).subscribe((id) => {
      this.snackBar.open(
        song.id ? 'Песня Успешно изменена' : 'Песня Успешно добавлена',
        'Зачыніць',
        { duration: 2000 },
      );

      this.router.navigate(['admin', 'edit', id], { relativeTo: this.route.root.firstChild });
      this.songDataForm.setValue({
        title: song.title,
        text: this.mergeChordWidthText(song as unknown as Song), // update with chord
        tags: this.setTag((arg) => !!song.tag[arg.id]),
      });
    });
  }

  private initLoadData() {
    this.route.data.pipe(
      pluck('song'),
      filter(Boolean),
      takeUntil(this.onDestroy$),
    ).subscribe((song) => {
      this.songDataForm.setValue({
        title: song.title,
        text: this.mergeChordWidthText(song), // update with chord
        tags: this.setTag((arg) => !!song.tag[arg.id]),
      });
    });
  }

  private setTag<T extends(arg: TagList) => any>(getValue: T) {
    return TAGS_LIST.reduce<{[key: string]: ReturnType<T>}>((acc, tag) => {
      acc[tag.id.toString()] = getValue(tag);

      return acc;
    }, {});
  }

  private mergeChordWidthText(song: Song): string {
    const text = song.text.split('\n');
    const chord = song.chord.split('\n');
    const item = text.length > chord.length ? text : chord;

    return item.map((_, index) => {
      if (chord[index]?.trim()) {
        return `${chord[index]}\n${text[index]}`;
      }

      return text[index];
    }).join('\n');
  }
}
