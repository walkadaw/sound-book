import { DOCUMENT, PLATFORM_ID, Service, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Service()
export class NetworkService {
  // the prerendered page counts as offline so nothing that needs the network is baked into it
  private readonly onlineState = signal(false);

  readonly online = this.onlineState.asReadonly();

  constructor() {
    const window = inject(DOCUMENT).defaultView;

    if (!isPlatformBrowser(inject(PLATFORM_ID)) || !window) {
      return;
    }

    this.onlineState.set(window.navigator.onLine);
    window.addEventListener('online', () => this.onlineState.set(true));
    window.addEventListener('offline', () => this.onlineState.set(false));
  }
}
