import {
  AfterViewInit, Component, OnDestroy,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  filter,
  map, pluck, Subject, takeUntil,
} from 'rxjs';
import { TAGS_LIST } from '../../../constants/tag-list';
import { Song } from '../../../interfaces/song';
import { TagList } from '../../../interfaces/tag-list';
import { SongService } from '../../../services/song-service/song.service';

@Component({
  selector: 'app-edit',
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss'],
})
export class EditComponent implements AfterViewInit, OnDestroy {
  readonly tagList = TAGS_LIST;

  songDataForm = new FormGroup({
    title: new FormControl('', Validators.required),
    text: new FormControl('', Validators.required),
    tags: new FormGroup(this.setTag(() => new FormControl(false))),
  });

  private onDestroy$ = new Subject<void>();

  constructor(
    private songService: SongService,
    private route: ActivatedRoute,
  ) {}

  ngAfterViewInit(): void {
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

    const song: Song = {
      id: this.route.snapshot.params.id,
      title: title.trim(),
      text: text.split('\n').map((v: string) => v.trim()).join('\n'),
      // TODO seporeate text on text and chord
      chord: null,
      tag: tags,
    };

    this.songService.addEditSong(song);
  }

  private initLoadData() {
    this.route.params.pipe(
      pluck('id'),
      filter(Boolean),
      map((id) => this.songService.getSong(id)),
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
