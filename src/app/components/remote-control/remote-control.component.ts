import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, Injector, OnInit, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { ProgramPanelComponent } from '../program-panel/program-panel.component';
import { RemoteDeckComponent } from './remote-deck/remote-deck.component';
import { RemoteMovesComponent } from './remote-moves/remote-moves.component';
import { RemoteNextComponent } from './remote-next/remote-next.component';
import { RemoteNotesComponent } from './remote-notes/remote-notes.component';
import { RemoteSession } from './remote-session.service';
import { RemoteStageComponent } from './remote-stage/remote-stage.component';
import { RemoteStatusComponent } from './remote-status/remote-status.component';
import { RemoteTheme } from './remote-theme/remote-theme';
import { RemoteThemeComponent } from './remote-theme/remote-theme.component';
import { RemoteTimerComponent } from './remote-timer/remote-timer.component';

export type RemoteTab = 'deck' | 'program';

/** By the width of the window, not the kind of device: a tablet turned on its side gets the wide layout. */
export type RemoteLayout = 'narrow' | 'medium' | 'wide';

const MEDIUM = '(min-width: 720px)';
const WIDE = '(min-width: 1100px)';

const TABS: { id: RemoteTab; title: string; icon: string }[] = [
  { id: 'deck', title: 'Пульт', icon: 'tv' },
  { id: 'program', title: 'Праграма', icon: 'format_list_bulleted' },
];

/** The remote: the same screen on a phone, a tablet, another computer or a window beside the presentation. */
@Component({
  selector: 'app-remote-control',
  imports: [
    MatButton,
    MatIcon,
    MatProgressSpinner,
    ProgramPanelComponent,
    RemoteDeckComponent,
    RemoteMovesComponent,
    RemoteNextComponent,
    RemoteNotesComponent,
    RemoteStageComponent,
    RemoteStatusComponent,
    RemoteThemeComponent,
    RemoteTimerComponent,
  ],
  providers: [RemoteSession, RemoteTheme],
  templateUrl: './remote-control.component.html',
  styleUrl: './remote-control.component.scss',
  host: {
    // On the document: right after the page opens the focus is on the body, outside the component.
    '(document:keydown)': 'onKeydown($event)',
    '[style.color-scheme]': 'theme.scheme()',
  },
})
export class RemoteControlComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private injector = inject(Injector);
  protected session = inject(RemoteSession);
  protected theme = inject(RemoteTheme);

  readonly tabs = TABS;
  readonly tab = signal<RemoteTab>('deck');

  private breakpoints = inject(BreakpointObserver);
  private matches = toSignal(this.breakpoints.observe([MEDIUM, WIDE]), {
    initialValue: {
      matches: false,
      breakpoints: { [MEDIUM]: this.breakpoints.isMatched(MEDIUM), [WIDE]: this.breakpoints.isMatched(WIDE) },
    },
  });

  readonly layout = computed<RemoteLayout>(() => {
    const { breakpoints } = this.matches();

    return breakpoints[WIDE] ? 'wide' : breakpoints[MEDIUM] ? 'medium' : 'narrow';
  });

  // Until the presentation answers, only the connection shows: nothing else on the remote would work.
  readonly offlineHint = computed(() => {
    const local = this.session.local();

    switch (this.session.status()) {
      case 'busy':
        return 'Каб кіраваць адсюль, адключыце іншую прыладу ў акне прэзентацыі і адсканіруйце новы код.';
      case 'lost':
        return local
          ? 'Прэзентацыя закрыта. Адкрыйце пульт зноў кнопкай «Кіраванне» ў меню прэзентацыі.'
          : 'Не ўдалося злучыцца з прэзентацыяй. Праверце інтэрнэт і паспрабуйце зноў або адсканіруйце код яшчэ раз.';
      case 'closed':
        return 'Прэзентацыя адключыла гэты пульт або была закрыта. Каб кіраваць зноў, адсканіруйце новы код.';
      default:
        if (this.session.state()) {
          return 'Сувязь перапынілася — аднаўляем…';
        }

        return local ? 'Шукаем прэзентацыю ў гэтым браўзеры…' : 'Злучаемся з прэзентацыяй праз інтэрнэт…';
    }
  });

  protected programPanel = viewChild(ProgramPanelComponent);

  ngOnInit() {
    const { data, params } = this.route.snapshot;

    if (data['window']) {
      this.session.joinWindow(params['presentation']);
    } else {
      this.session.joinRoom(params['room']);
    }
  }

  showTab(tab: RemoteTab) {
    this.tab.set(tab);
  }

  focusSearch() {
    this.tab.set('program');
    afterNextRender(() => this.programPanel()?.focusSearch(), { injector: this.injector });
  }

  onKeydown(event: KeyboardEvent) {
    const modified = event.altKey || event.ctrlKey || event.metaKey;

    if (event.defaultPrevented || modified || isTyping(event.target) || inPopup(event.target)) {
      return;
    }

    const action = this.hotkey(event);

    if (action) {
      event.preventDefault();
      action();
    }
  }

  // By the key's place, not its letter, so B and T work with the Belarusian layout too.
  private hotkey({ key, code }: KeyboardEvent): (() => void) | null {
    const { session } = this;

    switch (true) {
      case key === 'ArrowRight' || key === 'PageDown':
        return () => session.next();
      case key === 'ArrowLeft' || key === 'PageUp':
        return () => session.prev();
      case code === 'KeyB':
        return () => session.setBlackout(!session.blackout());
      case code === 'KeyT':
        return () => session.setLight(!session.light());
      case key === '/' || code === 'Slash':
        return () => this.focusSearch();
      default:
        return null;
    }
  }
}

// A menu over the remote keeps its keys: the arrows move through it, not the slides.
function inPopup(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('.cdk-overlay-container');
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}
