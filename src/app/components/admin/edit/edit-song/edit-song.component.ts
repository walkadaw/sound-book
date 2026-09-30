import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  linkedSignal,
  computed,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { fromEvent } from 'rxjs';
import { parseSong } from '../../../../services/chord/song-parser';

const MIN_LINE_COUNT = 50;
const CHORD_MARK = '♪';

@Component({
  selector: 'app-edit-song',
  templateUrl: './edit-song.component.html',
  styleUrls: ['./edit-song.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditSongComponent),
      multi: true,
    },
  ],
  imports: [ReactiveFormsModule],
})
export class EditSongComponent implements AfterViewInit, ControlValueAccessor {
  private destroyRef = inject(DestroyRef);

  readonly lineCounter = viewChild.required<ElementRef<HTMLTextAreaElement>>('lineCounter');
  readonly textEditor = viewChild.required<ElementRef<HTMLTextAreaElement>>('textEditor');
  readonly highlight = viewChild.required<ElementRef<HTMLElement>>('highlight');
  readonly placeholder = input('');

  textForm = new FormControl('', { nonNullable: true });

  private text = toSignal(this.textForm.valueChanges, { initialValue: '' });

  /** Shows the author which lines will be saved as chords, the same way the song gets saved */
  protected chordLines = computed(() => parseSong(this.text()).map((line) => line.kind === 'chords'));

  protected chordLineCount = computed(() => this.chordLines().filter(Boolean).length);

  // the counter never shrinks below the longest text seen so far
  private lineCount = linkedSignal<number, number>({
    source: computed(() => this.chordLines().length),
    computation: (count, previous) => Math.max(count, previous?.value ?? MIN_LINE_COUNT),
  });

  protected lineNumbers = computed(() => {
    const chordLines = this.chordLines();

    return Array.from({ length: this.lineCount() }, (_, index) =>
      `${chordLines[index] ? `${CHORD_MARK} ` : ''}${index + 1}.`).join('\n');
  });

  onTouched: () => void;
  private onChange: (value: string) => void;

  ngAfterViewInit(): void {
    this.bindScroll();

    this.textForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.onChange(value));
  }

  private bindScroll() {
    fromEvent(this.textEditor().nativeElement, 'scroll')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const top = this.textEditor().nativeElement.scrollTop;

        this.lineCounter().nativeElement.scroll({ top });
        this.highlight().nativeElement.scroll({ top });
      });
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  writeValue(value: string): void {
    this.textForm.setValue(value ?? '');
  }
}
