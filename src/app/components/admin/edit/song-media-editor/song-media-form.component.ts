import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, hidden, maxLength, required, submit, validate } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { EMPTY, Subject, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { SongMedia, SongMediaDraft } from '../../../../interfaces/song-media';
import { formatDuration } from '../../../song-media/song-media-player';
import { mediaLink, parseMediaLink, parseTime } from './media-link';
import { YoutubePreviewComponent } from './youtube-preview.component';

interface MediaFormModel {
  link: string;
  title: string;
  author: string;
  /** the song is only a part of the recording, so it has a start and an end */
  fragment: boolean;
  start: string;
  end: string;
  duration: string;
}

type AutoField = 'title' | 'author' | 'duration';

interface YoutubeInfo {
  title?: string;
  author_name?: string;
}

/** the columns are SMALLINT UNSIGNED */
const MAX_SECONDS = 65535;

const timeError = (value: string) => {
  const seconds = parseTime(value);

  return Number.isNaN(seconds) || (seconds ?? 0) > MAX_SECONDS
    ? { kind: 'time', message: 'Увядзіце час як 90, 1:30 або 1:01:30' }
    : null;
};

@Component({
  selector: 'app-song-media-form',
  templateUrl: './song-media-form.component.html',
  styleUrl: './song-media-form.component.scss',
  imports: [
    FormField,
    MatButton,
    MatCheckbox,
    MatError,
    MatFormField,
    MatHint,
    MatInput,
    MatLabel,
    YoutubePreviewComponent,
  ],
})
export class SongMediaFormComponent {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  /** null adds a new record */
  readonly media = input<SongMedia | null>(null);
  /** stores the record; the form shows an error if the promise rejects */
  readonly save = input.required<(draft: SongMediaDraft) => Promise<unknown>>();

  readonly cancelled = output<void>();

  // the list reloads after every change and hands over new objects, which must not wipe what is being typed here
  private stored = computed(() => this.media(), {
    equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  private model = linkedSignal<MediaFormModel>(() => {
    const media = this.stored();

    return {
      link: media ? mediaLink(media) : '',
      title: media?.title ?? '',
      author: media?.author ?? '',
      fragment: media?.startAt != null || media?.endAt != null,
      start: media?.startAt == null ? '' : formatDuration(media.startAt),
      end: media?.endAt == null ? '' : formatDuration(media.endAt),
      duration: media?.duration == null ? '' : formatDuration(media.duration),
    };
  });

  protected readonly mediaForm = form(this.model, (path) => {
    required(path.link, { message: 'Устаўце спасылку' });
    maxLength(path.link, 1024);
    maxLength(path.title, 255);
    maxLength(path.author, 255);
    validate(path.link, ({ value }) =>
      value() && !parseMediaLink(value())
        ? { kind: 'link', message: 'Патрэбна https-спасылка на YouTube, Google Drive або файл' }
        : null,
    );
    // hidden fields are not validated, and toDraft() does not save them
    hidden(path.start, ({ valueOf }) => !valueOf(path.fragment));
    hidden(path.end, ({ valueOf }) => !valueOf(path.fragment));
    required(path.start, { message: 'Пазначце, дзе пачынаецца песня' });
    validate(path.start, ({ value }) => timeError(value()));
    hidden(path.duration, ({ valueOf }) =>
      valueOf(path.fragment) ? fragmentLength(valueOf(path.start), valueOf(path.end)) !== null : false,
    );
    validate(path.duration, ({ value }) => timeError(value()));
    validate(path.end, ({ value, valueOf }) => {
      const start = parseTime(valueOf(path.start));
      const end = parseTime(value());

      return (
        timeError(value()) ??
        (start != null && end != null && end <= start
          ? { kind: 'order', message: 'Канец павінен быць пазней за пачатак' }
          : null)
      );
    });
  });

  protected readonly times = [
    { key: 'start', label: 'Пачатак', optional: false },
    { key: 'end', label: 'Канец', optional: true },
  ] as const;

  protected readonly formatDuration = formatDuration;

  protected readonly link = computed(() => parseMediaLink(this.model().link));
  protected readonly youtubeId = computed(() => {
    const link = this.link();

    return link?.source === 'youtube' ? link.ref : null;
  });

  // start and end come from the form only once they are valid, so the player never gets NaN
  protected readonly startAt = computed(() => (this.model().fragment ? validSeconds(this.model().start) : null));
  protected readonly endAt = computed(() => (this.model().fragment ? validSeconds(this.model().end) : null));
  /** a fragment's duration is always its length, so it is not typed in */
  protected readonly fragmentDuration = computed(() =>
    this.model().fragment ? fragmentLength(this.model().start, this.model().end) : null,
  );

  /** the link whose start is in the form, so retyping the same link keeps the admin's edits */
  private appliedLink = linkedSignal(() => {
    const media = this.stored();

    return media ? mediaLink(media) : '';
  });

  private player = viewChild(YoutubePreviewComponent);
  protected readonly playerReady = signal(false);
  protected readonly saveError = signal(false);

  /** what the form filled in by itself; the next link may replace these, but never what the admin typed */
  private autoFilled: Pick<MediaFormModel, AutoField> = { title: '', author: '', duration: '' };

  /** null cancels the request for the previous link */
  private youtubeInfo = new Subject<string | null>();

  constructor() {
    this.youtubeInfo
      .pipe(
        switchMap((id) =>
          id === null
            ? EMPTY
            : this.http
                .get<YoutubeInfo>('https://www.youtube.com/oembed', {
                  params: { url: `https://www.youtube.com/watch?v=${id}`, format: 'json' },
                })
                .pipe(catchError(() => of<YoutubeInfo>({}))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ title, author_name }) => this.autoFill({ title: title ?? '', author: author_name ?? '' }));
  }

  // a new link brings its own start, while an existing record keeps its own on load
  protected onLinkInput(value: string): void {
    const link = parseMediaLink(value);

    if (!link || mediaLink(link) === this.appliedLink()) {
      return;
    }

    this.appliedLink.set(mediaLink(link));
    this.playerReady.set(false);
    // the previous link's names and length do not belong to the new one
    this.autoFill({ title: '', author: '', duration: '' });
    this.model.update((model) => ({
      ...model,
      // a link to a moment in a video is almost always a song inside a longer recording
      ...(link.startAt == null ? {} : { fragment: true, start: formatDuration(link.startAt) }),
    }));

    this.youtubeInfo.next(link.source === 'youtube' ? link.ref : null);
  }

  protected onPlayerReady(): void {
    this.playerReady.set(true);

    const duration = Math.round(this.player()?.getDuration() ?? 0);
    // a whole video's length is only right for a record that plays the whole video
    if (duration && !this.model().fragment) {
      this.autoFill({ duration: formatDuration(duration) });
    }
  }

  private autoFill(values: Partial<Pick<MediaFormModel, AutoField>>): void {
    const model = { ...this.model() };

    for (const [key, value] of Object.entries(values) as [AutoField, string][]) {
      if (!model[key] || model[key] === this.autoFilled[key]) {
        model[key] = value;
        this.autoFilled[key] = value;
      }
    }

    this.model.set(model);
  }

  protected takeTime(field: 'start' | 'end'): void {
    const player = this.player();

    if (player) {
      this.model.update((model) => ({ ...model, [field]: formatDuration(Math.floor(player.getCurrentTime())) }));
      this.mediaForm[field]().markAsTouched();
    }
  }

  /** plays from the start, or the last seconds before the end, to check a boundary */
  protected listen(from: 'start' | 'end'): void {
    const player = this.player();
    const seconds = from === 'start' ? this.startAt() : this.endAt();

    if (player && seconds != null) {
      player.play(from === 'start' ? seconds : Math.max(seconds - 5, 0));
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.saveError.set(false);

    submit(this.mediaForm, async () => {
      const draft = this.toDraft();

      if (!draft) {
        return;
      }

      try {
        await this.save()(draft);
      } catch {
        this.saveError.set(true);
      }
    });
  }

  private toDraft(): SongMediaDraft | null {
    const link = this.link();

    if (!link) {
      return null;
    }

    const { title, author, duration } = this.model();

    return {
      id: this.media()?.id ?? null,
      source: link.source,
      ref: link.ref,
      title: title.trim() || null,
      author: author.trim() || null,
      duration: this.fragmentDuration() ?? validSeconds(duration),
      startAt: this.startAt(),
      endAt: this.endAt(),
    };
  }
}

function fragmentLength(start: string, end: string): number | null {
  const from = validSeconds(start);
  const to = validSeconds(end);

  return from != null && to != null && to > from ? to - from : null;
}

function validSeconds(value: string): number | null {
  const seconds = parseTime(value);

  return seconds != null && !Number.isNaN(seconds) && seconds <= MAX_SECONDS ? seconds : null;
}
