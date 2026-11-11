import { Component, computed, inject } from '@angular/core';
import { RemoteSession } from '../remote-session.service';
import { deviceCount } from '../remote-text';

@Component({
  selector: 'app-remote-status',
  host: {
    role: 'status',
    '[attr.data-status]': 'session.status()',
  },
  template: `<span class="dot" aria-hidden="true"></span>{{ text() }}`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      font-size: var(--app-fs-meta);
      color: var(--mat-sys-on-surface-variant);
    }

    .dot {
      flex-shrink: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: light-dark(#1e7d3c, #7fd99a);
    }

    :host([data-status='connecting']) .dot {
      background: light-dark(#8a5a00, #f5c46b);
    }

    :host([data-status='lost']) .dot,
    :host([data-status='closed']) .dot,
    :host([data-status='busy']) .dot {
      background: var(--mat-sys-error);
    }
  `,
})
export class RemoteStatusComponent {
  protected session = inject(RemoteSession);

  readonly text = computed(() => {
    switch (this.session.status()) {
      case 'connecting':
        return 'Падключэнне…';
      case 'lost':
        return 'Сувязь страчана';
      case 'closed':
        return 'Пульт адключаны';
      case 'busy':
        return 'Пультам ужо кіруе іншая прылада';
      default: {
        if (!this.session.local()) {
          return 'Падключана';
        }

        // Beside the presentation the screen is right there; what matters is who else controls it.
        const others = Math.max(0, (this.session.state()?.remotes ?? 1) - 1);

        return others ? `Экран і ${deviceCount(others)} падключаны` : 'Экран падключаны';
      }
    }
  });
}
