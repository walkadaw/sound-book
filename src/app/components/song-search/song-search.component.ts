import { Component, DestroyRef, ElementRef, computed, inject, output, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { ALL_TAGS, SEARCH_FILTERS } from '../../constants/tag-list';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { clearSearchAction, setSearchTermAction } from '../../redux/actions/search.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { getShowMenu } from '../../redux/selector/settings.selector';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-song-search',
  templateUrl: './song-search.component.html',
  styleUrl: './song-search.component.scss',
  imports: [MatIcon, MatIconButton, ReactiveFormsModule],
  host: {
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class SongSearchComponent {
  private store = inject<Store<IAppState>>(Store);
  private destroyRef = inject(DestroyRef);
  private hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly isFocusInput = output<boolean>();

  private readonly filters = SEARCH_FILTERS;
  protected readonly searchTerm = new FormControl('', { nonNullable: true });
  private selectedTagId = this.store.selectSignal(getSelectedTag);
  private showMenu = this.store.selectSignal(getShowMenu);
  private isFocused = false;

  protected readonly selectedFilter = computed(
    () => this.filters.find((item) => item.id === this.selectedTagId()) ?? ALL_TAGS,
  );

  constructor() {
    this.store
      .select(getSearchTerm)
      .pipe(
        filter((value) => value !== this.searchTerm.value),
        takeUntilDestroyed(),
      )
      .subscribe((value) => this.searchTerm.setValue(value, { emitEvent: false }));

    this.searchTerm.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.store.dispatch(setSearchTermAction(value)));

    this.destroyRef.onDestroy(() => this.store.dispatch(clearSearchAction()));
  }

  protected clear(): void {
    this.store.dispatch(clearSearchAction());
    this.searchTerm.setValue('', { emitEvent: false });
    this.searchInput().nativeElement.focus();
  }

  focusSearch(): void {
    this.openSongMenu();
  }

  protected onFocusIn(): void {
    if (this.isFocused) {
      return;
    }

    this.isFocused = true;
    this.isFocusInput.emit(true);
    this.openSongMenu();
  }

  protected onFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget as Node | null;

    if (nextTarget && this.hostRef.nativeElement.contains(nextTarget)) {
      return;
    }

    this.isFocused = false;
    this.isFocusInput.emit(false);
  }

  private openSongMenu(): void {
    if (!this.showMenu()) {
      this.store.dispatch(changeShowMenuAction(true));
    }

    setTimeout(() => this.searchInput().nativeElement.focus());
  }
}
