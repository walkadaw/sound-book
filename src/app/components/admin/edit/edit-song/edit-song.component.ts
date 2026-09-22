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
import { fromEvent, map } from 'rxjs';

const MIN_LINE_COUNT = 50;

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
  readonly placeholder = input('');

  textForm = new FormControl('', { nonNullable: true });

  private textLineCount = toSignal(this.textForm.valueChanges.pipe(map((value) => value.split('\n').length)), {
    initialValue: 0,
  });

  // the counter never shrinks below the longest text seen so far
  private lineCount = linkedSignal<number, number>({
    source: this.textLineCount,
    computation: (count, previous) => Math.max(count, previous?.value ?? MIN_LINE_COUNT),
  });

  protected lineNumbers = computed(() =>
    Array.from({ length: this.lineCount() }, (_, index) => `${index + 1}.`).join('\n'),
  );

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
        this.lineCounter().nativeElement.scroll({ top: this.textEditor().nativeElement.scrollTop });
      });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  writeValue(value: string): void {
    this.textForm.setValue(value ?? '');
  }
}
