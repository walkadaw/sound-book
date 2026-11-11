import { Component, booleanAttribute, computed, inject, input, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RemoteSession } from '../remote-session.service';

/** The lyrics of the current song with their chords; hidden for the parts of a mass, which have none. */
@Component({
  selector: 'app-remote-notes',
  imports: [MatIcon],
  host: { '[class.collapsible]': 'collapsible()', '[hidden]': '!lines().length' },
  template: `
    @if (collapsible()) {
      <h2 class="title">
        <button
          type="button"
          class="toggle"
          aria-controls="remote-notes"
          [attr.aria-expanded]="open()"
          (click)="toggle()"
        >
          Нататкі
          <mat-icon aria-hidden="true" [class.open]="open()">expand_more</mat-icon>
        </button>
      </h2>
    } @else {
      <h2 class="title">Нататкі</h2>
    }
    @if (!collapsible() || open()) {
      <div
        id="remote-notes"
        class="body"
        [attr.tabindex]="collapsible() ? null : 0"
        [attr.role]="collapsible() ? null : 'region'"
        [attr.aria-label]="collapsible() ? null : 'Нататкі'"
      >
        @for (line of lines(); track $index) {
          @if (line.chords.trim()) {
            <div class="chords">{{ line.chords }}</div>
          }
          <div class="lyrics">{{ line.text }}</div>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.4em;
      min-height: 0;
    }

    :host([hidden]) {
      display: none;
    }

    /* folded into a scrolling column, the notes take their full height and the column scrolls */
    :host(.collapsible) {
      flex-shrink: 0;
      gap: 0;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
    }

    .title {
      margin: 0;
      font-family: inherit;
      font-size: var(--app-fs-small);
      font-weight: 500;
      letter-spacing: normal;
      color: var(--app-text);
    }

    .toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: 44px;
      padding: 0 0.75em;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;

      &:focus-visible {
        outline: 3px solid var(--mat-sys-primary);
        outline-offset: 2px;
      }
    }

    mat-icon {
      transition: transform 0.15s;

      &.open {
        transform: rotate(180deg);
      }
    }

    .body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 0.75em;
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
      font-size: var(--app-fs-small);
      line-height: 1.5;
    }

    :host(.collapsible) .body {
      flex: none;
      padding-top: 0;
      overflow: visible;
      background: none;
    }

    .chords,
    .lyrics {
      white-space: pre-wrap;
    }

    /* an empty line between the stanzas keeps its height */
    .lyrics {
      min-height: 1.5em;
    }

    .chords {
      color: var(--app-accent-muted);
      font-weight: 500;
    }
  `,
})
export class RemoteNotesComponent {
  private session = inject(RemoteSession);

  /** A phone folds the notes away under a heading button. */
  readonly collapsible = input(false, { transform: booleanAttribute });

  readonly open = signal(false);
  readonly lines = computed(() => this.session.currentSong()?.notes ?? []);

  toggle() {
    this.open.update((open) => !open);
  }
}
