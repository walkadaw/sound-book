import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { RemoteAddComponent } from './remote-add/remote-add.component';
import { RemoteDeckComponent } from './remote-deck/remote-deck.component';
import { RemoteNextComponent } from './remote-next/remote-next.component';
import { RemoteNotesComponent } from './remote-notes/remote-notes.component';
import { RemoteProgramComponent } from './remote-program/remote-program.component';
import { RemoteSession } from './remote-session.service';
import { RemoteStageComponent } from './remote-stage/remote-stage.component';
import { RemoteStatusComponent } from './remote-status/remote-status.component';
import { RemoteTimerComponent } from './remote-timer/remote-timer.component';

export type RemoteTab = 'deck' | 'program' | 'add';

/** What the side column of a wide remote shows. */
export type SideView = 'program' | 'add';

/** By the width of the window, not the kind of device: a tablet turned on its side gets the wide layout. */
export type RemoteLayout = 'narrow' | 'medium' | 'wide';

const MEDIUM = '(min-width: 720px)';
const WIDE = '(min-width: 1100px)';

const TABS: { id: RemoteTab; title: string; icon: string }[] = [
  { id: 'deck', title: 'Пульт', icon: 'tv' },
  { id: 'program', title: 'Праграма', icon: 'format_list_bulleted' },
  { id: 'add', title: 'Дадаць', icon: 'add' },
];

/** The remote: the same screen on a phone, a tablet, another computer or a window beside the presentation. */
@Component({
  selector: 'app-remote-control',
  imports: [
    MatButton,
    MatIcon,
    MatProgressSpinner,
    RemoteAddComponent,
    RemoteDeckComponent,
    RemoteNextComponent,
    RemoteNotesComponent,
    RemoteProgramComponent,
    RemoteStageComponent,
    RemoteStatusComponent,
    RemoteTimerComponent,
  ],
  providers: [RemoteSession],
  templateUrl: './remote-control.component.html',
  styleUrl: './remote-control.component.scss',
  host: {
    // On the document: right after the page opens the focus is on the body, outside the component.
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class RemoteControlComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private injector = inject(Injector);
  protected session = inject(RemoteSession);

  readonly tabs = TABS;
  readonly tab = signal<RemoteTab>('deck');
  readonly sideView = signal<SideView>('program');

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

  private addPanel = viewChild(RemoteAddComponent);
  private programButton = viewChild<ElementRef<HTMLButtonElement>>('programButton');

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
    if (this.layout() === 'narrow') {
      this.tab.set('add');
    } else {
      this.sideView.set('add');
    }

    afterNextRender(() => this.addPanel()?.focusSearch(), { injector: this.injector });
  }

  // The search field goes away with the view, so the focus moves to the button that brought the program back.
  showProgram() {
    this.sideView.set('program');
    afterNextRender(() => this.programButton()?.nativeElement.focus(), { injector: this.injector });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) {
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

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}
