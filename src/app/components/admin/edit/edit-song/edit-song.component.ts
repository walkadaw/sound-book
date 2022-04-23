import {
  AfterViewInit, Component, ElementRef, forwardRef, Input, OnDestroy, ViewChild,
} from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  distinctUntilChanged, fromEvent,
  map, merge, of, Subject, takeUntil,
} from 'rxjs';

@Component({
  selector: 'app-edit-song',
  templateUrl: './edit-song.component.html',
  styleUrls: ['./edit-song.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    // eslint-disable-next-line no-use-before-define
    useExisting: forwardRef(() => EditSongComponent),
    multi: true,
  }],
})
export class EditSongComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild('lineCounter') lineCounter: ElementRef<HTMLTextAreaElement>;
  @ViewChild('textEditor') textEditor: ElementRef<HTMLTextAreaElement>;
  @Input() placeholder = '';

  textForm = new FormControl('');

  lineCounter$ = merge(
    of(Array(50).fill('')),
    this.textForm.valueChanges.pipe(map((value: string) => value.split('\n'))),
  ).pipe(
    distinctUntilChanged((a, b) => a.length > b.length),
    map((lines) => lines.map((_, index) => `${index + 1}.`).join('\n')),
  );

  onTouched: () => void;
  private onChange: (value: string) => void;
  private onDestroy$ = new Subject<void>();

  ngAfterViewInit(): void {
    this.bindScroll();

    this.textForm.valueChanges.pipe(
      takeUntil(this.onDestroy$),
    ).subscribe((value) => this.onChange(value));
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  private bindScroll() {
    fromEvent(this.textEditor.nativeElement, 'scroll').pipe(
      takeUntil(this.onDestroy$),
    ).subscribe(() => {
      this.lineCounter.nativeElement.scroll({ top: this.textEditor.nativeElement.scrollTop });
    });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  writeValue(value: string): void {
    this.textForm.setValue(value);
  }
}
