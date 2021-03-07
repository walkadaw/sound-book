import {
  Component,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { IAppState } from '../../redux/models/IAppState';
import { Store } from '@ngrx/store';
import { setSearchTermAction, clearSearchAction, setSelectedTagAction } from '../../redux/actions/search.actions';
import { Subject } from 'rxjs';
import { FuseService } from '../../services/fuse-service/fuse.service';
import { TagList } from '../../interfaces/tag-list';
import { TAGS_LIST } from '../../constants/tag-list';
import { getCurrentValue } from '../utils/redux.utils';
import { getShowMenu } from '../../redux/selector/settings.selector';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';

@Component({
  selector: 'app-search-song',
  templateUrl: './search-song.component.html',
  styleUrls: ['./search-song.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SearchSongComponent implements OnInit, OnDestroy {
  @ViewChild('search', { read: ElementRef }) searchElement: ElementRef<HTMLElement>;
  @Output() isFocusInput = new EventEmitter<boolean>();

  selected = 0;
  searchTerm = new FormControl();
  readonly tagsList: TagList[] = [
    {
      id: null,
      title: 'Усе',
      icon: null,
    },
    ...TAGS_LIST,
  ];
  private onDestroy$ = new Subject<void>();

  constructor(private store: Store<IAppState>, private fuseService: FuseService) {}

  ngOnInit() {
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
