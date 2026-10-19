import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormField, form, hidden, maxLength, required, submit, validate } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { EMPTY, Subject, merge, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SongMedia, SongMediaDraft } from '../../../../interfaces/song-media';
import { SongService } from '../../../../services/song-service/song.service';
import { AUDIO_EXTENSIONS, formatDuration, uploadUrl } from '../../../song-media/song-media-player';
import { mediaLink, parseMediaLink, parseTime } from './media-link';
import { YoutubePreviewComponent } from './youtube-preview.component';

interface MediaFormModel {
  link: string;
  /** the name the server gave an uploaded file; while it is set the record is this file, not the link */
  upload: string;
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

/** the same limit as api/song/_media_upload.php */
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const AUDIO_FILE = new RegExp(`\\.(${AUDIO_EXTENSIONS.join('|')})$`, 'i');

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
    MatProgressBar,
    YoutubePreviewComponent,
  ],
})
export class SongMediaFormComponent {
  private http = inject(HttpClient);
  private songService = inject(SongService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private document = inject(DOCUMENT);

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
      link: media && media.source !== 'upload' ? mediaLink(media) : '',
      upload: media?.source === 'upload' ? media.ref : '',
      title: media?.title ?? '',
      author: media?.author ?? '',
      fragment: media?.startAt != null || media?.endAt != null,
      start: media?.startAt == null ? '' : formatDuration(media.startAt),
      end: media?.endAt == null ? '' : formatDuration(media.endAt),
      duration: media?.duration == null ? '' : formatDuration(media.duration),
    };
  });

  protected readonly mediaForm = form(this.model, (path) => {
    hidden(path.link, { when: ({ valueOf }) => !!valueOf(path.upload) });
    required(path.link, { message: 'Устаўце спасылку або загрузіце файл' });
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
  protected readonly uploadUrl = uploadUrl;
  protected readonly accept = ['audio/*', ...AUDIO_EXTENSIONS.map((extension) => `.${extension}`)].join(',');

  protected readonly upload = computed(() => this.model().upload);
  protected readonly link = computed(() => (this.upload() ? null : parseMediaLink(this.model().link)));
  /** a file is offered only while there is no link, so a record never shows both */
  protected readonly canUpload = computed(() => !this.upload() && !this.model().link.trim());
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

    return media && media.source !== 'upload' ? mediaLink(media) : '';
  });

  private player = viewChild(YoutubePreviewComponent);
  private linkInput = viewChild<ElementRef<HTMLInputElement>>('linkInput');
  // the ref sits on a MatButton component, which a plain query would return instead of the element
  private replaceFileButton = viewChild('replaceFile', { read: ElementRef<HTMLButtonElement> });
  protected readonly playerReady = signal(false);
  protected readonly saveError = signal(false);

  /** the name of the file picked here; a stored record only knows the server's name */
  protected readonly uploadName = linkedSignal<SongMedia | null, string | null>({
    source: this.stored,
    computation: () => null,
  });

  /** percent, null while nothing is being uploaded */
  protected readonly uploadProgress = signal<number | null>(null);
  protected readonly uploadError = signal<string | null>(null);

  /** what the form filled in by itself; the next link may replace these, but never what the admin typed */
  private autoFilled: Pick<MediaFormModel, AutoField> = { title: '', author: '', duration: '' };

  /** null cancels the request for the previous link */
  private youtubeInfo = new Subject<string | null>();

  /** a file starts its upload, null cancels the one in progress */
  private uploads = new Subject<File | null>();

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

    // another record resets the model, so a file still uploading for the previous one must not land in it
    merge(this.uploads, toObservable(this.stored).pipe(map((): null => null)))
      .pipe(
        switchMap((file) => {
          this.uploadProgress.set(file ? 0 : null);

          return file
            ? this.songService.uploadSongMedia(file).pipe(
                map((event) => ({ file, event })),
                catchError((error: HttpErrorResponse) => {
                  this.uploadProgress.set(null);
                  this.uploadError.set(
                    error.status === 413 ? 'Сервер не прымае такі вялікі файл' : 'Не атрымалася загрузіць файл',
                  );
                  return EMPTY;
                }),
              )
            : EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ file, event }) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
        } else if (event.type === HttpEventType.Response && event.body) {
          this.uploadProgress.set(null);
          this.onUploaded(file, event.body.ref);
        }
      });
  }

  // a new link brings its own start, while an existing record keeps its own on load
  protected onLinkInput(value: string): void {
    const link = parseMediaLink(value);

    if (!link || mediaLink(link) === this.appliedLink()) {
      return;
    }

    this.appliedLink.set(mediaLink(link));
    this.playerReady.set(false);
    this.releaseStoredDuration();
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

  /** the stored length belongs to the stored recording, so a new link or file may replace it unless it was edited */
  private releaseStoredDuration(): void {
    const duration = this.stored()?.duration;

    if (duration != null && this.model().duration === formatDuration(duration)) {
      this.autoFilled.duration = this.model().duration;
    }
  }

  protected pickFile(fileInput: HTMLInputElement): void {
    if (this.uploadProgress() === null) {
      fileInput.click();
    }
  }

  protected onFileSelected(fileInput: HTMLInputElement): void {
    const file = fileInput.files?.[0];
    // so picking the same file again after an error still gives a change event
    fileInput.value = '';

    if (!file) {
      return;
    }

    if (!AUDIO_FILE.test(file.name)) {
      this.uploadError.set('Патрэбны аўдыяфайл: mp3, m4a, aac, ogg, opus, wav або flac');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      this.uploadError.set('Файл большы за 30 МБ');
      return;
    }

    this.uploadError.set(null);
    this.uploads.next(file);
  }

  private onUploaded(file: File, ref: string): void {
    this.model.update((model) => ({ ...model, upload: ref }));
    this.uploadName.set(file.name);
    this.playerReady.set(false);
    // a YouTube link typed before is no longer used, nor are the names it brought
    this.youtubeInfo.next(null);
    this.releaseStoredDuration();
    this.autoFill({ title: fileTitle(file.name), author: '', duration: '' });
    this.readDuration(file);
    // the upload button gives way to the file, so the focus goes to the button that replaces it
    afterNextRender(() => this.replaceFileButton()?.nativeElement.focus(), { injector: this.injector });
  }

  private readDuration(file: File): void {
    const audio = this.document.createElement('audio');
    const url = URL.createObjectURL(file);
    const done = () => URL.revokeObjectURL(url);

    audio.preload = 'metadata';
    audio.addEventListener('error', done);
    audio.addEventListener('loadedmetadata', () => {
      done();
      const duration = Math.round(audio.duration);
      // the file's length is only right for a record that plays the whole file
      if (Number.isFinite(duration) && duration && !this.model().fragment) {
        this.autoFill({ duration: formatDuration(duration) });
      }
    });
    audio.src = url;
  }

  protected removeUpload(): void {
    this.uploads.next(null);
    this.model.update((model) => ({ ...model, upload: '' }));
    this.uploadName.set(null);
    // the pressed button is gone, so the focus goes to the link field that takes the file's place
    afterNextRender(() => this.linkInput()?.nativeElement.focus(), { injector: this.injector });
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
    const { title, author, duration, upload } = this.model();
    const link = upload ? { source: 'upload' as const, ref: upload } : this.link();

    if (!link) {
      return null;
    }

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

/** `01_Ave-Maria.mp3` → `01 Ave Maria` */
function fileTitle(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
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
