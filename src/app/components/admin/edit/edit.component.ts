import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Change, diffWords } from 'diff';
import {
  catchError,
  EMPTY,
  filter, pluck, Subject, switchMap, takeUntil,
} from 'rxjs';
import { TAGS_LIST } from '../../../constants/tag-list';
import { Song, SongAdd } from '../../../interfaces/song';
import { TagList } from '../../../interfaces/tag-list';
import { ChordService } from '../../../services/chord/chord.service';
import { SongService } from '../../../services/song-service/song.service';

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

  constructor(
    private songService: SongService,
    private chordService: ChordService,
    private route: ActivatedRoute,
    private router: Router,
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

    const songID = this.route.snapshot.params.id;
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

    this.songService.updateSong(song).pipe(takeUntil(this.onDestroy$)).subscribe((id) => {
      this.router.navigate(['edit', id], { relativeTo: this.route.root.firstChild });
    });
  }

  private initLoadData() {
    this.route.params.pipe(
      pluck('id'),
      filter(Boolean),
      switchMap((id) => this.songService.getSongWithoutCache(id)),
      catchError(() => {
        this.router.navigate(['/404'], { skipLocationChange: true });
        return EMPTY;
      }),
      takeUntil(this.onDestroy$),
    ).subscribe((song) => {
      if (!song) {
        this.router.navigate(['/404'], { skipLocationChange: true });
        return;
      }
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
