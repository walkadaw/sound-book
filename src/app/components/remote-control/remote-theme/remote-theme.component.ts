import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RemoteTheme } from './remote-theme';

@Component({
  selector: 'app-remote-theme',
  imports: [MatIconButton, MatIcon],
  template: `
    <button
      mat-icon-button
      type="button"
      aria-label="Цёмная тэма пульта"
      title="Цёмная тэма пульта"
      [attr.aria-pressed]="theme.dark()"
      (click)="theme.toggle()"
    >
      <mat-icon aria-hidden="true">{{ theme.dark() ? 'dark_mode' : 'light_mode' }}</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    button {
      --mat-icon-button-state-layer-size: 44px;

      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class RemoteThemeComponent {
  protected theme = inject(RemoteTheme);
}
