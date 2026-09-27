import { DOCUMENT, DestroyRef, Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatMenuTrigger } from '@angular/material/menu';

const GUARD_MS = 400;

/**
 * On narrow touch screens a submenu can open on top of its trigger, and the tap that opened it
 * also lands as a click on whatever submenu item is now under the finger.
 * Upstream: https://github.com/angular/components/issues/30888
 */
@Directive({
  selector: '[matMenuTriggerFor][appSubmenuGhostClickGuard]',
})
export class SubmenuGhostClickGuardDirective {
  private readonly document = inject(DOCUMENT);
  private readonly trigger = inject(MatMenuTrigger);
  private removeGuard?: () => void;

  constructor() {
    this.trigger.menuOpened.pipe(takeUntilDestroyed()).subscribe(() => this.guardPanel());
    inject(DestroyRef).onDestroy(() => this.removeGuard?.());
  }

  private guardPanel(): void {
    // The trigger attaches the panel to the DOM before emitting menuOpened, so it can be found synchronously.
    const panelId = this.trigger.menu?.panelId;
    const panel = panelId ? this.document.getElementById(panelId) : null;

    if (!panel) {
      return;
    }

    this.removeGuard?.();

    // Capture phase so the click is dropped before RouterLink or (click) handlers on the items see it.
    const swallowClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const timeout = setTimeout(() => this.removeGuard?.(), GUARD_MS);

    panel.addEventListener('click', swallowClick, true);
    this.removeGuard = () => {
      clearTimeout(timeout);
      panel.removeEventListener('click', swallowClick, true);
      this.removeGuard = undefined;
    };
  }
}
