import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-page-header',
  imports: [RouterLink],
  template: `
    <a class="back" routerLink="/admin">← Админка</a>
    <h2 class="page-title">{{ title() }}</h2>
    <ng-content />
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 16px;
    }

    .back {
      color: var(--mat-sys-primary);
    }

    h2 {
      margin: 8px 0 4px;
    }
  `,
})
export class AdminPageHeaderComponent {
  readonly title = input.required<string>();
}
