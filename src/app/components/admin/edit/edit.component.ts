import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Change, diffWords } from 'diff';
import { filter, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { TagList, TAGS_LIST } from '../../../constants/tag-list';
import { Song, SongAdd } from '../../../interfaces/song';
import { ChordService } from '../../../services/chord/chord.service';
import { SongService } from '../../../services/song-service/song.service';
import { DuplicateService } from '../../../services/duplicate/duplicate.service';
import { SimilarSongDialogComponent } from '../../similar-song-dialog/similar-song-dialog.component';
import { DiffResultComponent } from '../../diff-result/diff-result.component';
import { EditSongComponent } from './edit-song/edit-song.component';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    EditSongComponent,
    MatCheckbox,
    MatIcon,
    MatButton,
    DiffResultComponent,
  ],
})
export class EditComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private songService = inject(SongService);
  private chordService = inject(ChordService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private duplicateService = inject(DuplicateService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly tagList = TAGS_LIST;

  songDataForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    text: new FormControl('', { nonNullable: true, validators: Validators.required }),
    tags: new FormGroup(this.setTag(() => new FormControl(false, { nonNullable: true }))),
  });

  diff: Change[];

  get songID(): number {
    return +this.route.snapshot.params['id'];
  }

  ngOnInit(): void {
    this.initLoadData();
  }

  onSave() {
    const { title, text, tags } = this.songDataForm.getRawValue();

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
      text: content.text.trimEnd(),
      chord: content.chord.trimEnd(),
      tag: Object.keys(tags)
        .filter((key) => tags[key])
        .join(','),
    };

    const duplication = this.songService.songList().filter(
      (originSong) => +originSong.id !== +song.id && this.duplicateService.isSimilar(originSong.text, song.text),
    );

    if (duplication.length) {
      this.dialog
        .open(SimilarSongDialogComponent, { data: { song, duplication } })
        .afterClosed()
        .pipe(filter((newSong) => !!newSong))
        .subscribe((newSong) => {
          this.saveSong(newSong);
        });
      return;
    }

    this.saveSong(song);
  }

  private saveSong(song: SongAdd): void {
    this.songService
      .updateSong(song)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.snackBar.open(song.id ? 'Песня Успешно изменена' : 'Песня Успешно добавлена', 'Зачыніць', {
          duration: 2000,
        });

        this.router.navigate(['admin', 'edit', id], { relativeTo: this.route.root.firstChild });
        this.songDataForm.setValue({
          title: song.title,
          text: this.mergeChordWidthText(song as unknown as Song), // update with chord
          tags: this.setTag((arg) => !!song.tag[arg.id]),
        });
      });
  }

  private initLoadData() {
    this.route.data
      .pipe(
        map((data) => data['song'] as Song | undefined),
        filter(Boolean),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((song) => {
        this.songDataForm.setValue({
          title: song.title,
          text: this.mergeChordWidthText(song), // update with chord
          tags: this.setTag((arg) => !!song.tag[arg.id]),
        });
      });
  }

  private setTag<T>(getValue: (arg: TagList) => T) {
    return TAGS_LIST.reduce<Record<string, T>>((acc, tag) => {
      acc[tag.id.toString()] = getValue(tag);

      return acc;
    }, {});
  }

  private mergeChordWidthText(song: Song): string {
    const text = song.text.split('\n');
    const chord = song.chord.split('\n');
    const item = text.length > chord.length ? text : chord;

    return item
      .map((_, index) => {
        if (chord[index]?.trim()) {
          return `${chord[index]}\n${text[index] ?? ''}`;
        }

        return text[index] ?? '';
      })
      .join('\n');
  }
}
