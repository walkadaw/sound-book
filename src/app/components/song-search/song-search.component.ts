import { Component, DestroyRef, ElementRef, computed, inject, output, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { TAGS_LIST, TagList } from '../../constants/tag-list';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { clearSearchAction, setSearchTermAction, setSelectedTagAction } from '../../redux/actions/search.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { getShowMenu } from '../../redux/selector/settings.selector';
import { getCurrentValue } from '../utils/redux.utils';

const ALL_TAGS: TagList = { id: 0, title: 'Усе', icon: '' };
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-song-search',
  templateUrl: './song-search.component.html',
  styleUrl: './song-search.component.scss',
  imports: [MatIcon, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, ReactiveFormsModule],
})
export class SongSearchComponent {
  private store = inject<Store<IAppState>>(Store);
  private destroyRef = inject(DestroyRef);

  private searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly isFocusInput = output<boolean>();

  protected readonly filters: TagList[] = [ALL_TAGS, ...TAGS_LIST];
  protected readonly searchTerm = new FormControl('', { nonNullable: true });
  private selectedTagId = this.store.selectSignal(getSelectedTag);

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

  protected selectFilter(filterId: number): void {
    this.store.dispatch(setSelectedTagAction(filterId));
    this.openSongMenu();
  }

  protected clear(): void {
    this.store.dispatch(clearSearchAction());
    this.searchTerm.setValue('', { emitEvent: false });
    this.searchInput().nativeElement.focus();
  }

  protected onFocus(): void {
    this.isFocusInput.emit(true);
    this.openSongMenu();
  }

  protected onBlur(): void {
    this.isFocusInput.emit(false);
  }

  private openSongMenu(): void {
    if (!getCurrentValue(this.store, getShowMenu)) {
      this.store.dispatch(changeShowMenuAction(true));
    }

    setTimeout(() => this.searchInput().nativeElement.focus());
  }
}
