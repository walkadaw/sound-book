import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { IAppState } from '../../redux/models/IAppState';
import { Store } from '@ngrx/store';
import { SetSearchTermAction, ClearSearchAction } from '../../redux/actions/search.actions';
import { Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MenuSearchDialogComponent } from '../menu-search-dialog/menu-search-dialog.component';

@Component({
  selector: 'app-search-song',
  templateUrl: './search-song.component.html',
  styleUrls: ['./search-song.component.scss'],
})
export class SearchSongComponent implements OnInit, OnDestroy {
  searchTerm = new FormControl();
  private onDestroy$ = new Subject<void>();

  constructor(
    private store: Store<IAppState>,
    private activatedRoute: ActivatedRoute,
    private route: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.searchTerm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.onDestroy$))
      .subscribe((value) => this.store.dispatch(new SetSearchTermAction(value)));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onFocus() {
    if (!this.route.isActive('/', true) && !this.dialog.getDialogById('MenuSearchDialogComponent')) {
      this.dialog.open(MenuSearchDialogComponent, {
        id: 'MenuSearchDialogComponent',
        width: '700px',
        height: '100%',
        restoreFocus: false,
      });
    }
  }

  onClear() {
    this.store.dispatch(new ClearSearchAction());
    this.searchTerm.setValue('');
  }
}
