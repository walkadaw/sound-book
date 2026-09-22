import { Service, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Service()
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);
  private snackBar = inject(MatSnackBar);

  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.promptReload());

    this.swUpdate.unrecoverable.subscribe(() => window.location.reload());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.swUpdate.checkForUpdate().catch(() => {});
      }
    });
  }

  private promptReload(): void {
    const snackBarRef = this.snackBar.open('Даступна новая версія', 'Абновіць');

    snackBarRef.onAction().subscribe(() => {
      this.swUpdate.activateUpdate().then(() => window.location.reload());
    });
  }
}
