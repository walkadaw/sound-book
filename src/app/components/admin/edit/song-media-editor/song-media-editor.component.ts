import {
  Component,
  DOCUMENT,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { SongMedia, SongMediaDraft } from '../../../../interfaces/song-media';
import { SongService } from '../../../../services/song-service/song.service';
import { SOURCE_NAMES, formatDuration } from '../../../song-media/song-media-player';
import { mediaLink } from './media-link';
import { SongMediaFormComponent } from './song-media-form.component';

@Component({
  selector: 'app-song-media-editor',
  templateUrl: './song-media-editor.component.html',
  styleUrl: './song-media-editor.component.scss',
  imports: [MatButton, MatIcon, MatIconButton, SongMediaFormComponent],
})
export class SongMediaEditorComponent {
  private songService = inject(SongService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private document = inject(DOCUMENT);

  /** null for a song that is not created yet: its records are kept here until saveDrafts() */
  readonly songId = input.required<number | null>();

  protected readonly media = rxResource({
    params: () => {
      const id = this.songId();

      return id ? { id } : undefined;
    },
    stream: ({ params }) => this.songService.getSongMediaWithoutCache(params.id),
  });

  // reordering shows at once and is sent in the background; a new song's records only live here
  private list = linkedSignal(() => (this.media.hasValue() ? this.media.value() : []));
  /** drafts get negative ids, which never clash with stored records */
  private lastDraftId = 0;

  protected readonly items = computed(() =>
    this.list().map((media, index) => ({
      media,
      label: media.title || `Запіс ${index + 1}`,
      link: mediaLink(media),
      details: [
        media.author,
        SOURCE_NAMES[media.source] ?? media.source,
        fragment(media),
        media.duration ? formatDuration(media.duration) : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
  );

  /** the record open in the form, 'new' for one being added */
  protected readonly editing = linkedSignal<number | null, number | 'new' | null>({
    source: this.songId,
    computation: () => null,
  });

  protected readonly busy = signal(false);

  protected readonly save = async (draft: SongMediaDraft): Promise<void> => {
    const songId = this.songId();
    const isNew = draft.id === null;

    if (songId) {
      // a reorder sent meanwhile would not know the new record and be refused
      this.busy.set(true);
      try {
        await firstValueFrom(this.songService.saveSongMedia(songId, draft));
      } finally {
        this.busy.set(false);
      }
      this.snackBar.open(isNew ? 'Запіс дададзены' : 'Запіс захаваны', 'Зачыніць', { duration: 2000 });
      this.media.reload();
    } else {
      const media: SongMedia = { ...draft, id: draft.id ?? --this.lastDraftId };

      this.list.update((list) =>
        isNew ? [...list, media] : list.map((item) => (item.id === media.id ? media : item)),
      );
    }

    this.editing.set(null);
  };

  /** stores the drafts of a just created song one at a time, so they keep their order; resolves with how many failed */
  async saveDrafts(songId: number): Promise<number> {
    let failed = 0;

    for (const media of this.list()) {
      try {
        await firstValueFrom(this.songService.saveSongMedia(songId, { ...media, id: null }));
      } catch {
        failed++;
      }
    }

    return failed;
  }

  protected edit(id: number | 'new'): void {
    this.editing.update((editing) => (editing === id ? null : id));
  }

  // the buttons stay focusable while disabled, so a keyboard user keeps their place, and still get clicks
  protected move(index: number, offset: -1 | 1): void {
    if (this.busy() || !this.list()[index + offset]) {
      return;
    }

    const list = [...this.list()];
    const [media] = list.splice(index, 1);
    list.splice(index + offset, 0, media);
    this.list.set(list);

    // moving the row in the DOM can drop the focus, so it goes back to the button that was pressed
    afterNextRender(
      () => this.document.getElementById(`song-media-${offset < 0 ? 'up' : 'down'}-${media.id}`)?.focus(),
      { injector: this.injector },
    );

    const songId = this.songId();

    if (songId) {
      this.request(
        this.songService.orderSongMedia(
          songId,
          list.map(({ id }) => id),
        ),
        'Не атрымалася змяніць парадак',
      );
    }
  }

  protected remove(media: SongMedia, label: string): void {
    if (this.busy() || !window.confirm(`Выдаліць запіс «${label}»?`)) {
      return;
    }

    if (this.songId()) {
      this.request(this.songService.deleteSongMedia(media.id), 'Не атрымалася выдаліць запіс', 'Запіс выдалены');
    } else {
      this.list.update((list) => list.filter(({ id }) => id !== media.id));
    }
  }

  // after a failure the list is reloaded, so it shows what the server really has
  private request(request: Observable<void>, failure: string, success?: string): void {
    this.busy.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        if (success) {
          this.snackBar.open(success, 'Зачыніць', { duration: 2000 });
          this.media.reload();
        }
      },
      error: () => {
        this.busy.set(false);
        this.snackBar.open(failure, 'Зачыніць', { duration: 3000 });
        this.media.reload();
      },
    });
  }
}

function fragment({ startAt, endAt }: Pick<SongMedia, 'startAt' | 'endAt'>): string | null {
  if (startAt == null && endAt == null) {
    return null;
  }

  return `${formatDuration(startAt ?? 0)}–${endAt == null ? 'канец' : formatDuration(endAt)}`;
}
