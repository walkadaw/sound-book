import { Component, inject } from '@angular/core';
import { RemoteSession } from '../remote-session.service';

/** The slides of the current song, to jump to one. */
@Component({
  selector: 'app-remote-dots',
  template: `
    @if (session.currentSong(); as song) {
      <nav aria-label="Слайды песні">
        @for (slide of song.slides; track $index; let i = $index) {
          <button
            type="button"
            [attr.aria-current]="song.startIndex + i === session.slide() ? 'true' : null"
            [attr.aria-label]="'Слайд ' + (i + 1)"
            [disabled]="!session.connected()"
            (click)="session.goTo(song.startIndex + i)"
          >
            {{ i + 1 }}
          </button>
        }
      </nav>
    }
  `,
  styles: `
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    button {
      min-width: 44px;
      height: 44px;
      padding: 0 0.5em;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 10px;
      background: transparent;
      color: var(--app-text);
      font: inherit;
      font-size: var(--app-fs-small);
      font-weight: 500;
      cursor: pointer;

      &[aria-current='true'] {
        border-color: var(--mat-sys-primary);
        background: var(--mat-sys-primary);
        color: var(--mat-sys-on-primary);
        font-weight: 700;
      }

      &:disabled {
        cursor: default;
        opacity: 0.6;
      }

      &:focus-visible {
        outline: 3px solid var(--mat-sys-primary);
        outline-offset: 2px;
      }
    }
  `,
})
export class RemoteDotsComponent {
  protected session = inject(RemoteSession);
}
