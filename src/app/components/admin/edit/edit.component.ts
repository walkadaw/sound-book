import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  BehaviorSubject, distinctUntilChanged, filter, fromEvent,
  map, pluck, startWith,
  Subject, switchMap,
  takeUntil, tap, timer,
  withLatestFrom,
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
  @ViewChild('lineCounter') lineCounter: ElementRef<HTMLTextAreaElement>;
  @ViewChild('textEditor') textEditor: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chordEditor') chordEditor: ElementRef<HTMLTextAreaElement>;

  readonly tagList = TAGS_LIST;

  songDataForm = new FormGroup({
    title: new FormControl('', Validators.required),
    text: new FormControl('', Validators.required),
    chord: new FormControl(''),
    tags: new FormGroup(this.setTag(() => new FormControl(false))),
  });

  lineCounter$ = this.songDataForm.get('text').valueChanges.pipe(
    map((value: string) => value.split('\n')),
    distinctUntilChanged((a, b) => a.length === b.length),
    map((lines) => lines.map((_, index) => `${index + 1}.`).join('\n')),
  );

  private onDestroy$ = new Subject<void>();

  constructor(
    private songService: SongService,
    private route: ActivatedRoute,
  ) {}

  ngAfterViewInit(): void {
    this.initLoadData();
    this.initTheSameLength();
    this.bindScroll();
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  fillLines() {
    const chord: string[] = this.songDataForm.value.chord.split('\n');
    const text: string[] = this.songDataForm.value.text.split('\n');

    if (text.length !== chord.length) {
      const max = text.length > chord.length ? text : chord;
      this.songDataForm.patchValue({
        text: max.map((value, index) => text[index] || '').join('\n'),
        chord: max.map((value, index) => chord[index] || '').join('\n'),
      }, { emitEvent: false });
    }
  }

  onSave() {
    const {
      title, text, chord, tags,
    } = this.songDataForm.value;

    const song: Song = {
      id: null,
      title: title.trim(),
      text: text.split('\n').map((v: string) => v.trim()).join('\n'),
      // INFO: when we save chord position we should not delete left empty string
      chord: chord.split('\n').map((v: string) => v.trim()).join('\n'),
      tag: tags,
    };

    console.log(song);
  }

  private initLoadData() {
    this.route.params.pipe(
      pluck('id'),
      map((id) => this.songService.getSong(id)),
      takeUntil(this.onDestroy$),
    ).subscribe((song) => {
      this.songDataForm.setValue({
        title: song.title,
        text: song.text,
        chord: song.chord,
        tags: this.setTag((arg) => !!song.tag[arg.id]),
      });
    });
  }

  // TODO hard to read and understand what happened
  private initTheSameLength() {
    this.songDataForm.get('text').valueChanges.pipe(
      startWith(this.songDataForm.get('text').value),
      map((value: string) => value.split('\n')),
      distinctUntilChanged((a, b) => a.length === b.length),
      filter((value) => value.length > this.songDataForm.get('chord').value.trimRight().split('\n').length),
      takeUntil(this.onDestroy$),
    ).subscribe((lines) => {
      const chord = this.songDataForm.get('chord').value.split('\n');
      this.songDataForm.patchValue({
        chord: lines.map((value, index) => chord[index] || '').join('\n'),
      }, { emitEvent: false });
    });

    this.songDataForm.get('chord').valueChanges.pipe(
      startWith(this.songDataForm.get('chord').value),
      map((value: string) => value.split('\n')),
      distinctUntilChanged((a, b) => a.length === b.length),
      filter((value) => value.length > this.songDataForm.get('text').value.trimRight().split('\n').length),
      takeUntil(this.onDestroy$),
    ).subscribe((lines) => {
      const text = this.songDataForm.get('text').value.split('\n');
      this.songDataForm.patchValue({
        text: lines.map((value, index) => text[index] || '').join('\n'),
      }, { emitEvent: false });
    });
  }

  private bindScroll() {
    const skipEvent$ = new BehaviorSubject<HTMLElement>(null);
    skipEvent$.pipe(
      filter(Boolean),
      switchMap(() => timer(300)),
      tap(() => skipEvent$.next(null)),
      takeUntil(this.onDestroy$),
    ).subscribe();

    fromEvent([this.textEditor.nativeElement, this.chordEditor.nativeElement], 'scroll').pipe(
      withLatestFrom(skipEvent$),
      filter(([scroll, skipEvent]) => scroll.target !== skipEvent),
      takeUntil(this.onDestroy$),
    ).subscribe(([scroll]) => {
      this.lineCounter.nativeElement.scroll({ top: (<HTMLElement>scroll.target).scrollTop });

      if (scroll.target === this.textEditor.nativeElement) {
        skipEvent$.next(this.chordEditor.nativeElement);
        this.chordEditor.nativeElement.scroll({ top: (<HTMLElement>scroll.target).scrollTop });
      }

      if (scroll.target === this.chordEditor.nativeElement) {
        skipEvent$.next(this.textEditor.nativeElement);
        this.textEditor.nativeElement.scroll({ top: (<HTMLElement>scroll.target).scrollTop });
      }
    });
  }

  private setTag<T extends(arg: TagList) => any>(getValue: T) {
    return TAGS_LIST.reduce<{[key: string]: ReturnType<T>}>((acc, tag) => {
      acc[tag.id.toString()] = getValue(tag);

      return acc;
    }, {});
  }
}
