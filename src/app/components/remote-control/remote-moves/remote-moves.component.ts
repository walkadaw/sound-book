import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RemoteSession } from '../remote-session.service';

/** The two big buttons of a phone remote that move the screen back and on, under every tab. */
@Component({
  selector: 'app-remote-moves',
  imports: [MatButton, MatIcon],
  template: `
    <button
      mat-flat-button
      type="button"
      class="prev"
      [disabled]="!session.connected() || session.atStart()"
      (click)="session.prev()"
    >
      <mat-icon aria-hidden="true">chevron_left</mat-icon>
      Назад
    </button>
    <button
      mat-flat-button
      type="button"
      class="next"
      [disabled]="!session.connected() || session.atEnd()"
      (click)="session.next()"
    >
      Далей
      <mat-icon aria-hidden="true" iconPositionEnd>chevron_right</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: flex;
      flex-shrink: 0;
      gap: 12px;
      padding: 12px 16px;
    }

    button {
      height: 72px;
      border-radius: 18px;
      font-size: var(--app-fs-small);
    }

    .prev {
      flex: 1;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface);
    }

    .next {
      flex: 2;
      font-size: 1em;
      font-weight: 700;
    }

    button:disabled {
      opacity: 0.5;
    }
  `,
})
export class RemoteMovesComponent {
  protected session = inject(RemoteSession);
}
