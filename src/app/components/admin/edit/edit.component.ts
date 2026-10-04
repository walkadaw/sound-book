import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, filter, finalize, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { TagList, TAGS_LIST } from '../../../constants/tag-list';
import { Song, SongAdd, SongVersion } from '../../../interfaces/song';
import { ChordService } from '../../../services/chord/chord.service';
import { ChordCheckService } from '../../../services/chord/chord-check.service';
import { SongService } from '../../../services/song-service/song.service';
import { isSimilarText } from '../../../services/duplicate/similar-text';
import { SimilarSongDialogComponent } from '../../similar-song-dialog/similar-song-dialog.component';
import { ChordIssuesComponent } from '../chord-issues/chord-issues.component';
import { EditSongComponent } from './edit-song/edit-song.component';
import { SongHistoryComponent } from './song-history/song-history.component';

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
    ChordIssuesComponent,
    SongHistoryComponent,
  ],
})
export class EditComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private songService = inject(SongService);
  private chordService = inject(ChordService);
  private chordCheckService = inject(ChordCheckService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly tagList = TAGS_LIST;

  songDataForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    text: new FormControl('', { nonNullable: true, validators: Validators.required }),
    tags: new FormGroup(this.setTag(() => new FormControl(false, { nonNullable: true }))),
  });

  protected readonly saving = signal(false);
  protected readonly historyReloadKey = signal(0);
  protected readonly formValue = toSignal(
    this.songDataForm.valueChanges.pipe(map(() => this.songDataForm.getRawValue())),
    { initialValue: this.songDataForm.getRawValue() },
  );

  // checked the way the song gets saved, which splits it into chord and lyrics lines
  protected readonly chordIssues = toSignal(
    this.songDataForm.controls.text.valueChanges.pipe(
      debounceTime(300),
      map((text) => this.chordService.getTextAndChord(text)),
      map(({ chord, text }) => this.chordCheckService.findIssues(chord, text)),
    ),
    { initialValue: [] },
  );

  get songID(): number {
    return +this.route.snapshot.params['id'];
  }

  ngOnInit(): void {
    this.initLoadData();
  }

  onSave() {
    if (this.songDataForm.invalid || this.saving()) {
      this.songDataForm.markAllAsTouched();
      return;
    }

    const { title, text, tags } = this.songDataForm.getRawValue();

    const { songID } = this;
    const content = this.chordService.getTextAndChord(text);

    const song: SongAdd = {
      id: songID,
      title: title.trim(),
      text: content.text.trimEnd(),
      chord: content.chord.trimEnd(),
      tag: Object.keys(tags)
        .filter((key) => tags[key])
        .join(','),
    };

    const duplication = this.songService
      .songList()
      .filter((originSong) => +originSong.id !== +song.id && isSimilarText(originSong.text, song.text));

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
    this.saving.set(true);

    this.songService
      .updateSong(song)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (id) => {
          this.snackBar.open(song.id ? 'Песня Успешно изменена' : 'Песня Успешно добавлена', 'Зачыніць', {
            duration: 2000,
          });

          const selectedTags = new Set(song.tag.split(','));

          this.router.navigate(['admin', 'edit', id], { relativeTo: this.route.root.firstChild });
          this.songDataForm.setValue({
            title: song.title,
            text: this.chordService.mergeTextAndChord(song), // update with chord
            tags: this.setTag((arg) => selectedTags.has(arg.id.toString())),
          });
          this.historyReloadKey.update((key) => key + 1);
        },
        error: () => this.snackBar.open('Не атрымалася захаваць песню', 'Зачыніць', { duration: 2000 }),
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
          text: this.chordService.mergeTextAndChord(song), // update with chord
          tags: this.setTag((arg) => !!song.tag[arg.id]),
        });
      });
  }

  // saving stays a separate step, so a restore becomes a new version only once the user confirms it
  protected onRestore(version: SongVersion): void {
    const selectedTags = new Set(version.tag.split(','));

    this.songDataForm.setValue({
      title: version.title,
      text: this.chordService.mergeTextAndChord(version),
      tags: this.setTag((arg) => selectedTags.has(arg.id.toString())),
    });
    this.songDataForm.markAsDirty();
    this.snackBar.open('Версія падстаўлена ў рэдактар — націсніце «Изменить», каб захаваць', 'Зачыніць', {
      duration: 4000,
    });
  }

  private setTag<T>(getValue: (arg: TagList) => T) {
    return TAGS_LIST.reduce<Record<string, T>>((acc, tag) => {
      acc[tag.id.toString()] = getValue(tag);

      return acc;
    }, {});
  }
}
