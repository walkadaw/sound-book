import { LiveAnnouncer } from '@angular/cdk/a11y';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuContent, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { insertionIndex } from '../../../services/program/program-entries';
import { ProgramControl, ProgramSong } from '../program-control';
import { scrollInto } from '../scroll-into';
import { ProgramEntry, programEntries } from './program-entries-view';

type FocusTarget = 'handle' | 'song' | 'more';

// The row to focus once the program has changed: on a remote the change comes back a moment later.
interface FocusRequest {
  index: number;
  id: string;
  target: FocusTarget;
  announceMove: boolean;
  // The program as it was asked: a copy of the same song may already stand at that index before the move.
  // Null when the program has the change already.
  before: readonly ProgramSong[] | null;
}

// A change the presentation turned down never comes; past this its focus request must not take the focus.
const FOCUS_WAIT = 3000;

/** The songs of the presentation: jump to one, move it, remove it. A mass is one row. */
@Component({
  selector: 'app-program-list',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDropList,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
    NgTemplateOutlet,
  ],
  templateUrl: './program-list.component.html',
  styleUrl: './program-list.component.scss',
})
export class ProgramListComponent {
  private announcer = inject(LiveAnnouncer);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly control = input.required<ProgramControl>();
  /** The song on the screen shows buttons for its slides. */
  readonly slideNumbers = input(false, { transform: booleanAttribute });
  readonly remove = output<ProgramEntry>();
  readonly navigated = output();

  readonly entries = computed(() =>
    programEntries(this.control().songs(), this.control().masses(), this.control().slide()),
  );

  // where a song shown next would go
  readonly nextIndex = computed(() => insertionIndex(this.control().songs(), this.control().slide()));

  private activeIndex = computed(() => this.entries().findIndex(({ status }) => status === 'active'));
  private focusRequest = signal<FocusRequest | null>(null);
  // set while a menu item runs: the menu closing must not take the focus back to its button
  private menuAction = false;
  private focusTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.focusTimer));

    // A slide change inside the same song leaves the list where the reader put it.
    afterRenderEffect(() => {
      const active = this.activeIndex();

      if (active >= 0) {
        this.revealRow(active);
      }
    });

    afterRenderEffect(() => {
      const request = this.focusRequest();
      const entries = this.entries();
      const songs = this.control().songs();

      if (!request) {
        return;
      }

      const position = entries.findIndex(({ index, id }) => index === request.index && id === request.id);

      if (position < 0 || songs === request.before) {
        return;
      }

      clearTimeout(this.focusTimer);
      this.focusRequest.set(null);
      this.row(position)?.querySelector<HTMLElement>(`.${request.target}`)?.focus({ preventScroll: true });
      this.revealRow(position);

      if (request.announceMove) {
        this.announcer.announce(`Перамешчана на месца ${position + 1} з ${entries.length}`);
      }
    });
  }

  /** Brings a song that was just added into view and gives it the focus. */
  showEntry(index: number) {
    const song = this.control().songs()[index];

    if (song) {
      this.requestFocus({ index, id: song.id, target: 'song', announceMove: false, before: null });
    }
  }

  /** Focuses the song on the screen, or else the first one; false for an empty program. */
  focusCurrent(): boolean {
    const entries = this.entries();
    const position = Math.max(
      0,
      entries.findIndex(({ status }) => status === 'active'),
    );
    const button = this.row(position)?.querySelector<HTMLElement>('.song');

    button?.focus({ preventScroll: true });

    if (button) {
      this.revealRow(position);
    }

    return !!button;
  }

  goToSlide(slide: number) {
    this.control().goTo(slide);
    this.navigated.emit();
  }

  onRowKeydown(event: KeyboardEvent, position: number) {
    if (event.key !== 'Delete' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    this.removeAt(position);
  }

  drop(event: CdkDragDrop<ProgramEntry[]>) {
    const { previousIndex, currentIndex } = event;
    const entries = this.entries();

    if (previousIndex !== currentIndex) {
      const target = entries[currentIndex];

      this.moveTo(previousIndex, currentIndex > previousIndex ? target.end : target.index, 'handle');
    }
  }

  moveBy(position: number, step: -1 | 1, target: FocusTarget) {
    const neighbour = this.entries()[position + step];

    if (neighbour) {
      this.moveTo(position, step < 0 ? neighbour.index : neighbour.end, target);
    }
  }

  moveTo(position: number, to: number, target: FocusTarget) {
    const entry = this.entries()[position];
    const control = this.control();

    if (!entry || !control.enabled() || to === entry.index || to === entry.end) {
      return;
    }

    const size = entry.end - entry.index;

    this.requestFocus({
      index: to > entry.index ? to - size : to,
      id: entry.id,
      target,
      announceMove: true,
      before: control.songs(),
    });
    control.move(entry.index, entry.id, to);
  }

  canShowNext(entry: ProgramEntry): boolean {
    const next = this.nextIndex();

    return entry.status !== 'active' && next !== entry.index && next !== entry.end;
  }

  removeAt(position: number) {
    const entries = this.entries();
    const entry = entries[position];

    if (!entry || !this.control().enabled()) {
      return;
    }

    const after = entries[position + 1];
    const before = entries[position - 1];

    const songs = this.control().songs();

    // the song after it takes its place, or else the one before keeps the focus
    if (after) {
      this.requestFocus({ index: entry.index, id: after.id, target: 'song', announceMove: false, before: songs });
    } else if (before) {
      this.requestFocus({ index: before.index, id: before.id, target: 'song', announceMove: false, before: songs });
    }

    this.remove.emit(entry);
  }

  // The items of the row menu act on the row the menu was opened for, found again by its index and id: another
  // remote may have changed the program meanwhile, and then the row at the same place is another song. They send
  // the focus where the change lands, not back to the menu button.
  menuMove(entry: ProgramEntry, step: -1 | 1) {
    this.fromMenu(entry, (position) => this.moveBy(position, step, 'more'));
  }

  menuMoveTo(entry: ProgramEntry, to: number) {
    this.fromMenu(entry, (position) => this.moveTo(position, to, 'more'));
  }

  menuRemove(entry: ProgramEntry) {
    this.fromMenu(entry, (position) => this.removeAt(position));
  }

  onMenuClosed(trigger: MatMenuTrigger) {
    if (this.menuAction) {
      this.menuAction = false;
    } else {
      trigger.focus();
    }
  }

  private fromMenu(entry: ProgramEntry, action: (position: number) => void) {
    const position = this.entries().findIndex(({ index, id }) => index === entry.index && id === entry.id);

    if (position >= 0) {
      this.menuAction = true;
      action(position);
    }
  }

  private requestFocus(request: FocusRequest) {
    clearTimeout(this.focusTimer);
    this.focusRequest.set(request);
    this.focusTimer = setTimeout(() => this.focusRequest.set(null), FOCUS_WAIT);
  }

  private row(position: number): HTMLElement | undefined {
    return this.host.nativeElement.querySelectorAll<HTMLElement>('li.entry')[position];
  }

  private revealRow(position: number) {
    const row = this.row(position);

    if (row) {
      scrollInto(this.host.nativeElement, row);
    }
  }
}
