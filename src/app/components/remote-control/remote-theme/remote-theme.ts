import { OverlayContainer } from '@angular/cdk/overlay';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { ThemeService } from '../../../services/theme/theme.service';

/**
 * The remote's own light or dark theme, for a dark church. It lasts while the remote is open and leaves the theme
 * chosen in the site settings as it was: the colour scheme is set on the remote, not on the page.
 */
@Injectable()
export class RemoteTheme {
  private site = inject(ThemeService);

  // null: as the site
  private chosen = signal<boolean | null>(null);

  readonly dark = computed(() => this.chosen() ?? this.site.isDark());
  readonly scheme = computed(() => {
    const chosen = this.chosen();

    return chosen === null ? null : chosen ? 'dark' : 'light';
  });

  constructor() {
    // Menus and dialogs open outside the remote, in the overlay container.
    const overlay = inject(OverlayContainer).getContainerElement();

    effect(() => (overlay.style.colorScheme = this.scheme() ?? ''));
    inject(DestroyRef).onDestroy(() => (overlay.style.colorScheme = ''));
  }

  toggle() {
    this.chosen.set(!this.dark());
  }
}
