import {
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RemoteSong } from '../../../services/remote-control/remote-control';
import { RemoteSession } from '../remote-session.service';
import { SlidePreviewComponent } from '../slide-preview/slide-preview.component';
import { slideCount, songCount } from '../remote-text';

export type SongStatus = 'past' | 'active' | 'future';

export interface ProgramItem {
  index: number;
  song: RemoteSong;
  status: SongStatus;
  meta: string;
}

export interface ProgramGroup {
  key: string;
  // the mass the parts belong to; null for songs on their own
  liturgy: string | null;
  title: string;
  items: ProgramItem[];
}

/** The songs of the presentation, with the masses kept together, to jump to a slide or remove a song. */
@Component({
  selector: 'app-remote-program',
  imports: [MatButton, MatIconButton, MatIcon, SlidePreviewComponent],
  templateUrl: './remote-program.component.html',
  styleUrl: './remote-program.component.scss',
})
export class RemoteProgramComponent {
  protected session = inject(RemoteSession);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Beside the main screen the current song shows its slide numbers instead of unfolding the slides. */
  readonly wide = input(false, { transform: booleanAttribute });
  readonly addSong = output();

  readonly summary = computed(
    () => `${songCount(this.session.songs().length)} · ${slideCount(this.session.slides().length)}`,
  );

  readonly groups = computed<ProgramGroup[]>(() => {
    const current = this.session.currentIndex();
    const masses = this.session.state()?.masses ?? [];
    const groups: ProgramGroup[] = [];

    this.session.songs().forEach((song, index) => {
      const status: SongStatus = current < 0 || index > current ? 'future' : index < current ? 'past' : 'active';
      const meta =
        status === 'active'
          ? `Слайд ${this.session.slide() - song.startIndex + 1} з ${song.slides.length}`
          : slideCount(song.slides.length);
      const item: ProgramItem = { index, song, status, meta };
      const last = groups.at(-1);

      if (last && last.liturgy === song.liturgy) {
        last.items.push(item);
      } else {
        groups.push({
          key: `${index}`,
          liturgy: song.liturgy,
          title: song.liturgy ? (masses.find(({ id }) => id === song.liturgy)?.title ?? 'Імша') : 'Асобныя песні',
          items: [item],
        });
      }
    });

    return groups;
  });

  // The current song unfolds by itself, until the reader picks another one.
  readonly expanded = linkedSignal<number | null>(() => this.session.currentIndex());

  constructor() {
    // A slide change inside the same song leaves the list where the reader put it.
    afterRenderEffect({
      read: () => {
        this.session.currentIndex();
        this.revealActive();
      },
    });
  }

  toggle(index: number) {
    this.expanded.update((expanded) => (expanded === index ? null : index));
  }

  private revealActive() {
    const list = this.host.nativeElement.querySelector<HTMLElement>('.list');
    const active = list?.querySelector('li.active');

    if (!list || !active) {
      return;
    }

    const box = list.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    const margin = 8;
    // a song taller than the list, unfolded with its slides, is shown from its start
    const toTop = item.top - box.top - margin;
    const toBottom = Math.min(item.bottom - box.bottom + margin, toTop);

    if (toTop < 0) {
      list.scrollTop += toTop;
    } else if (toBottom > 0) {
      list.scrollTop += toBottom;
    }
  }
}
