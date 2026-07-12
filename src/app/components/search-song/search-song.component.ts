import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild, ElementRef, Output, EventEmitter, inject } from '@angular/core';
import { UntypedFormControl, ReactiveFormsModule } from '@angular/forms';
import {
  debounceTime, distinctUntilChanged, filter, takeUntil,
} from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { IAppState } from '../../redux/models/IAppState';
import { setSearchTermAction, clearSearchAction, setSelectedTagAction } from '../../redux/actions/search.actions';
import { TagList, TAGS_LIST } from '../../constants/tag-list';
import { getCurrentValue } from '../utils/redux.utils';
import { getShowMenu } from '../../redux/selector/settings.selector';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { MatSuffix } from '@angular/material/form-field';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { MatOption } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { LetDirective } from '../../directives/let-directive/app-let.directive';

@Component({
    selector: 'app-search-song',
    templateUrl: './search-song.component.html',
    styleUrls: ['./search-song.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
    LetDirective,
    MatSelect,
    MatSelectTrigger,
    MatIcon,
    MatOption,
    MatInput,
    ReactiveFormsModule,
    MatButton,
    MatIconButton,
    MatSuffix,
    AsyncPipe
],
})
export class SearchSongComponent implements OnInit, OnDestroy {
  private store = inject<Store<IAppState>>(Store);

  @ViewChild('search', { read: ElementRef }) searchElement: ElementRef<HTMLElement>;
  @Output() isFocusInput = new EventEmitter<boolean>();

  selected$ = this.store.select(getSelectedTag);
  searchTerm = new UntypedFormControl();
  readonly tagsList: TagList[] = [
    {
      id: null,
      title: 'Усе',
      icon: null,
    },
    ...TAGS_LIST,
  ];

  private onDestroy$ = new Subject<void>();



  ngOnInit() {
    this.store
      .select(getSearchTerm)
      .pipe(filter((value) => value !== this.searchTerm.value))
      .subscribe((value) => {
        this.searchTerm.setValue(value);
      });

    this.searchTerm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.onDestroy$))
      .subscribe((value) => this.store.dispatch(setSearchTermAction(value)));
  }

  ngOnDestroy() {
    this.store.dispatch(clearSearchAction());
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClear() {
    this.store.dispatch(clearSearchAction());
    this.searchTerm.setValue('');
    this.searchElement.nativeElement.focus();
  }

  tagToggle(eventTag: number) {
    this.store.dispatch(setSelectedTagAction(eventTag));
    this.openSongMenu();
  }

  openSongMenu(): void {
    const showMenu = getCurrentValue(this.store, getShowMenu);
    if (!showMenu) {
      this.store.dispatch(changeShowMenuAction(true));
    }

    setTimeout(() => {
      this.searchElement.nativeElement.focus();
    }, 0);
  }

  onBlurInput() {
    this.isFocusInput.emit(false);
  }

  onFocusInput() {
    this.isFocusInput.emit(true);
    this.openSongMenu();
  }
}
