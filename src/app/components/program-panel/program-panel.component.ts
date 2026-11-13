import { LiveAnnouncer } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuContent, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ALL_TAGS, SEARCH_FILTERS } from '../../constants/tag-list';
import { FuseService, SongSearchResult } from '../../services/fuse-service/fuse.service';
import { MatchSnippet } from '../../services/fuse-service/search-text';
import { entryEnd } from '../../services/program/program-entries';
import { SongService } from '../../services/song-service/song.service';
import { MatchHighlightComponent } from '../match-highlight/match-highlight.component';
import { songCount } from '../remote-control/remote-text';
import { ProgramControl } from './program-control';
import { ProgramEntry } from './program-list/program-entries-view';
import { ProgramListComponent } from './program-list/program-list.component';
import { scrollInto } from './scroll-into';

interface SearchOption {
  // 'refresh': no masses for today, the row asks for them again
  kind: 'mass' | 'refresh' | 'song';
  // the id the program adds
  id: string;
  title: string;
  number: number | null;
  snippet: MatchSnippet | null;
  exact: boolean;
  // how many times the song is in the program already
  count: number;
  disabled: boolean;
  // the place among all the options, for the keyboard
  position: number;
}

const SNACK_TIME = 8000;
// How long a removal may take to come back in the program before it is no longer read out.
const REMOVAL_WAIT = 10000;

/**
 * Lists every song and mass of the day while the search field has the focus, narrowed by what is typed, and
 * adds them at the end of the program; shows the program otherwise.
 */
@Component({
  selector: 'app-program-panel',
  imports: [
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    MatMenuTrigger,
    MatchHighlightComponent,
    NgTemplateOutlet,
    ProgramListComponent,
  ],
  templateUrl: './program-panel.component.html',
  styleUrl: './program-panel.component.scss',
})
export class ProgramPanelComponent {
  private snackBar = inject(MatSnackBar);
  private announcer = inject(LiveAnnouncer);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);
  // an addition on a remote is answered a moment later, maybe after the panel went away with its tab
  private destroyed = false;
  // The list follows the chosen song when the arrows chose it, not the mouse over a row half in view.
  private followActive = false;
  // Read out once the song is gone from the program: the presentation turns down a song it no longer has there.
  private removal: { key: string; count: number; message: string } | null = null;
  private removalTimer?: ReturnType<typeof setTimeout>;
  private songService = inject(SongService);

  readonly control = input.required<ProgramControl>();
  /** The song on the screen shows buttons for its slides. */
  readonly slideNumbers = input(false, { transform: booleanAttribute });
  /** A song or a slide was picked: a menu over the presentation closes. */
  readonly navigated = output();
  /** Escape in an empty search field: the reader is done adding. */
  readonly leave = output();

  private searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');
  private results = viewChild<ElementRef<HTMLElement>>('results');
  private list = viewChild(ProgramListComponent);

  readonly tags = SEARCH_FILTERS;
  readonly search = signal('');
  readonly tag = signal(ALL_TAGS.id);
  readonly tagTitle = computed(() => this.tags.find(({ id }) => id === this.tag())?.title ?? ALL_TAGS.title);
  readonly query = computed(() => this.search().trim());
  readonly isNumber = computed(() => /^\d+$/.test(this.query()));
  readonly searchFocused = signal(false);
  readonly searching = computed(() => this.searchFocused() || !!this.query());

  private found = inject(FuseService).getSearchResults(this.tag, this.search, this.songService.songList);
  private foundSongs = computed(() => {
    const found = this.found();

    return this.isNumber() ? byNumber(found, this.query()) : found;
  });

  // a mass counts once, however many parts it has
  private inProgram = computed(() => {
    const counts = new Map<string, number>();
    const songs = this.control().songs();

    for (let index = 0; index < songs.length; index = entryEnd(songs, index)) {
      const key = songs[index].liturgy ?? songs[index].id;

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  });

  readonly options = computed<SearchOption[]>(() => {
    const query = this.query();

    if (!this.searching()) {
      return [];
    }

    const counts = this.inProgram();
    const search = query.toLowerCase();
    const control = this.control();
    const status = control.massesStatus();
    // a mass is found by its title or by the start of the word "літургія"; a song tag hides the masses
    const wanted = (title: string) =>
      !this.tag() && ('літургія'.startsWith(search) || title.toLowerCase().includes(search));
    const masses = control
      .masses()
      .filter(({ title }) => wanted(title))
      .map(({ id, title }): Omit<SearchOption, 'position'> => ({
        kind: 'mass',
        id,
        title,
        number: null,
        snippet: null,
        exact: false,
        count: counts.get(id) ?? 0,
        disabled: counts.has(id),
      }));
    // no masses for today: a row in their place asks for them again
    const refreshTitle = status === 'loading' ? 'Чытанні дня загружаюцца…' : 'Няма чытанняў на сёння';
    const refresh: Omit<SearchOption, 'position'>[] =
      status === 'ready' || !wanted(refreshTitle)
        ? []
        : [
            {
              kind: 'refresh',
              id: 'refresh-masses',
              title: refreshTitle,
              number: null,
              snippet: null,
              exact: false,
              count: 0,
              disabled: status === 'loading',
            },
          ];
    const songs = this.foundSongs().map(({ song, snippet }): Omit<SearchOption, 'position'> => ({
      kind: 'song',
      id: song.id.toString(),
      title: song.title,
      number: song.songId,
      snippet,
      exact: this.isNumber() && song.songId.toString() === query,
      count: counts.get(song.id.toString()) ?? 0,
      disabled: false,
    }));

    return [...masses, ...refresh, ...songs].map((option, position) => ({ ...option, position }));
  });

  readonly massesReady = computed(() => this.control().massesStatus() === 'ready');
  readonly massOptions = computed(() => this.options().filter(({ kind }) => kind !== 'song'));
  readonly songOptions = computed(() => this.options().filter(({ kind }) => kind === 'song'));

  // Enter adds the first song found; the whole list waits for the arrows before Enter does anything.
  readonly active = linkedSignal(() =>
    this.query() ? this.options().findIndex(({ disabled, kind }) => !disabled && kind !== 'refresh') : -1,
  );

  readonly activeId = computed(() => (this.searching() && this.active() >= 0 ? optionId(this.active()) : null));

  readonly countText = computed(() => {
    const songs = this.foundSongs().length;

    if (!this.query()) {
      return songCount(songs);
    }

    return songs || this.massOptions().length ? `Знойдзена: ${songCount(songs)}` : this.emptyTitle();
  });

  readonly emptyTitle = computed(() =>
    this.isNumber() ? `Песні з нумарам ${this.query()} няма` : `Па запыце «${this.query()}» нічога не знойдзена`,
  );

  readonly emptyHint = computed(() => {
    if (!this.isNumber()) {
      return 'Паспрабуйце іншы радок або толькі пачатак слова.';
    }

    const last = Math.max(0, ...this.songService.songList().map(({ songId }) => songId));

    return `Нумары ад 1 да ${last}`;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearTimeout(this.removalTimer);
    });

    effect(() => {
      const counts = this.inProgram();
      const removal = this.removal;

      if (removal && (counts.get(removal.key) ?? 0) < removal.count) {
        this.removal = null;
        clearTimeout(this.removalTimer);
        this.announcer.announce(removal.message);
      }
    });

    // Read out once the reader pauses, not on every key.
    effect((onCleanup) => {
      const text = this.query() ? this.countText() : null;

      if (text) {
        const timer = setTimeout(() => this.announcer.announce(text), 500);

        onCleanup(() => clearTimeout(timer));
      }
    });

    afterRenderEffect(() => {
      const id = this.activeId();
      const container = this.results()?.nativeElement;
      const option = id && container?.querySelector(`#${id}`);

      if (this.followActive && container && option) {
        scrollInto(container, option);
      }

      this.followActive = false;
    });

    // a new search starts at the top of the list
    afterRenderEffect(() => {
      this.query();

      const container = this.results()?.nativeElement;

      if (container) {
        container.scrollTop = 0;
      }
    });
  }

  focusSearch() {
    const field = this.searchInput().nativeElement;

    field.focus();
    field.select();
  }

  setSearch(value: string) {
    this.search.set(value);
  }

  clearSearch() {
    this.search.set('');
    this.searchInput().nativeElement.focus();
  }

  setTag(id: number) {
    this.tag.set(id);
    this.searchInput().nativeElement.focus();
  }

  // The list stays while the focus moves to the buttons beside the field or to the theme menu.
  onSearchFocusOut(event: FocusEvent) {
    const next = event.relatedTarget;
    const inside =
      next instanceof Element &&
      (!!next.closest('.cdk-overlay-container') ||
        (this.host.nativeElement.contains(next) && !next.closest('app-program-list')));

    if (!inside) {
      this.searchFocused.set(false);
    }
  }

  onSearchKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        this.step(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Enter':
        this.choose(this.active());
        break;
      case 'Escape':
        if (this.search()) {
          this.search.set('');
        } else {
          this.searchFocused.set(false);
          this.leave.emit();
          // back to the program on the song on the screen, rather than lost on the page
          afterNextRender(() => this.list()?.focusCurrent(), { injector: this.injector });
        }
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  choose(position: number) {
    const option = this.options()[position];

    if (!option || option.disabled || !this.control().enabled()) {
      return;
    }

    // the list stays open, to show the masses once they come
    if (option.kind === 'refresh') {
      this.control().refreshMasses();
      return;
    }

    // the search closes on the program, where the song shows up
    this.search.set('');
    this.searchFocused.set(false);
    this.add(option);
  }

  hover(position: number) {
    if (!this.options()[position]?.disabled) {
      this.active.set(position);
    }
  }

  optionId(position: number): string {
    return optionId(position);
  }

  removeEntry(entry: ProgramEntry) {
    const control = this.control();
    const onlyOne = control.songs().length === entry.end - entry.index;

    const key = entry.liturgy ?? entry.id;

    clearTimeout(this.removalTimer);
    this.removal = {
      key,
      count: this.inProgram().get(key) ?? 0,
      message: entry.liturgy ? `Імша «${entry.title}» выдалена` : `Выдалена «${entry.title}»`,
    };
    this.removalTimer = setTimeout(() => (this.removal = null), REMOVAL_WAIT);
    control.remove(entry.index, entry.id);

    if (onlyOne) {
      this.searchInput().nativeElement.focus();
    }
  }

  private step(by: 1 | -1) {
    const options = this.options();
    const from = this.active() < 0 && by < 0 ? options.length : this.active();

    this.followActive = true;

    for (let position = from + by; position >= 0 && position < options.length; position += by) {
      if (!options[position].disabled) {
        this.active.set(position);
        return;
      }
    }
  }

  private async add(option: SearchOption) {
    const index = await this.control().add(option.id);

    if (this.destroyed) {
      return;
    }

    if (index === null) {
      // No retry: a late answer may still have added the song, and a second try would add it twice.
      this.snackBar.open(`Не ўдалося дадаць «${option.title}». Праверце сувязь з прэзентацыяй.`, 'Зачыніць', {
        duration: SNACK_TIME,
      });
      // the field kept the focus: its list comes back, to try again or pick another song
      this.searchFocused.set(document.activeElement === this.searchInput().nativeElement);
      return;
    }

    afterNextRender(() => this.list()?.showEntry(index), { injector: this.injector });
    this.announcer.announce(option.count ? `«${option.title}» дададзена яшчэ раз` : `Дададзена «${option.title}»`);
  }
}

function optionId(position: number): string {
  return `program-option-${position}`;
}

// The song with exactly this number first, then the others with these digits by their number.
function byNumber(results: SongSearchResult[], query: string): SongSearchResult[] {
  const exact = Number(query);

  return [...results].sort(
    (a, b) => Number(b.song.songId === exact) - Number(a.song.songId === exact) || a.song.songId - b.song.songId,
  );
}
