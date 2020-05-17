import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-menu-search-dialog',
  templateUrl: './menu-search-dialog.component.html',
  styleUrls: ['./menu-search-dialog.component.scss'],
})
export class MenuSearchDialogComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  constructor(private router: Router, private dialogRef: MatDialogRef<MenuSearchDialogComponent>) {}

  ngOnInit(): void {
    this.router.events
      .pipe(
        tap(console.log),
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.onDestroy$)
      )
      .subscribe(() => this.dialogRef.close());
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
}
