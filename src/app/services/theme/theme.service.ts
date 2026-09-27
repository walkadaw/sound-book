import { DOCUMENT, Service, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'theme';

@Service()
export class ThemeService {
  private document = inject(DOCUMENT);
  private darkQuery = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

  readonly mode = signal<ThemeMode>(this.readStoredMode());

  constructor() {
    effect(() => this.apply(this.mode()));

    // In system mode the browser bar has to follow the OS switching between light and dark.
    this.darkQuery?.addEventListener('change', () => this.syncThemeColor());
  }

  setMode(mode: ThemeMode): void {
    try {
      if (mode === 'system') {
        localStorage.removeItem(THEME_KEY);
      } else {
        localStorage.setItem(THEME_KEY, mode);
      }
    } catch {
      // The choice still applies for this session when storage is unavailable.
    }

    this.mode.set(mode);
  }

  private apply(mode: ThemeMode): void {
    const root = this.document.documentElement;

    // Attributes rather than dataset: the prerender DOM does not implement dataset.
    if (mode === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', mode);
    }

    this.syncThemeColor();
  }

  private syncThemeColor(): void {
    const meta = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const view = this.document.defaultView;

    if (meta && view) {
      meta.content = view.getComputedStyle(this.document.body).backgroundColor;
    }
  }

  private readStoredMode(): ThemeMode {
    try {
      const stored = localStorage.getItem(THEME_KEY);

      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
