import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RemoteSession } from '../remote-session.service';

/** How long the presentation has been running; a click starts the count again from zero for every remote. */
@Component({
  selector: 'app-remote-timer',
  template: `
    <button type="button" title="Скінуць на нуль" [disabled]="!session.connected()" (click)="session.resetTimer()">
      <span class="cdk-visually-hidden">Скінуць таймер: </span>
      <span class="label">Ад пачатку</span>
      <span class="time">{{ time() }}</span>
    </button>
  `,
  styles: `
    :host {
      display: block;
      padding-top: 0.6em;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }

    button {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      box-sizing: border-box;
      width: 100%;
      min-height: 44px;
      padding: 0.25em 0.5em;
      border: 0;
      border-radius: 10px;
      background: transparent;
      color: var(--app-text);
      font: inherit;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--mat-sys-surface-container-high);
      }

      &:disabled {
        cursor: default;
      }

      &:focus-visible {
        outline: 3px solid var(--mat-sys-primary);
        outline-offset: 2px;
      }
    }

    .label {
      font-size: var(--app-fs-meta);
      color: var(--mat-sys-on-surface-variant);
    }

    .time {
      font-size: var(--app-fs-title);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class RemoteTimerComponent {
  protected session = inject(RemoteSession);
  private now = signal(Date.now());

  readonly time = computed(() => {
    const startedAt = this.session.startedAt();

    if (startedAt === null) {
      return '–:––';
    }

    const seconds = Math.max(0, Math.floor((this.now() - startedAt) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

    return hours ? `${hours}:${mmss}` : mmss;
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);

    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }
}
