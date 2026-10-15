import { Service, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import {
  ActivatedRouteSnapshot,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
  UrlTree,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { skip } from 'rxjs/operators';
import { SEARCH_FILTERS } from '../../constants/tag-list';
import { clearSearchAction, setSearchTermAction, setSelectedTagAction } from '../../redux/actions/search.actions';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getSearchTerm, getSelectedTag } from '../../redux/selector/search.selector';
import { getShowMenu } from '../../redux/selector/settings.selector';

// The song list is the home page; its tag filter lives in the URL,
// so Back restores it and a filtered list can be shared.
const TAG_PARAM = 'tag';
// Kept in the history entry of a list the app opened over a page: the way back to it survives Back and Forward.
const PAGE_BEHIND_STATE = 'songListPageBehind';
// Set when the list was reopened as it was left, not with a filter just picked, which starts from the top.
const RESUMED_STATE = 'songListResumed';
// The search of each list entry: Back to it and a reload bring that search back, without the query in the URL.
const SEARCH_STATE = 'songListSearch';

interface PageBehindList {
  songId: number | null;
}

@Service()
export class SongListService {
  private router = inject(Router);
  private location = inject(Location);
  private store = inject<Store<IAppState>>(Store);

  private isMenuOpen = this.store.selectSignal(getShowMenu);
  private selectedTag = this.store.selectSignal(getSelectedTag);
  private searchTerm = this.store.selectSignal(getSearchTerm);
  private page = signal<PageBehindList | null>(null);

  readonly openSongId = computed(() => this.page()?.songId ?? null);
  readonly resumed = signal(false);

  private fromHistory = false;
  private changedByHistory = false;
  private leaving = false;

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.fromHistory = event.navigationTrigger === 'popstate' || !this.router.navigated;
        this.syncMenu(this.router.parseUrl(event.url));
      } else if (event instanceof NavigationEnd) {
        const url = this.router.parseUrl(event.urlAfterRedirects);
        const state = isHomePage(url) ? this.location.getState() : null;

        this.leaving = false;
        this.syncMenu(url);
        this.syncTag(url);
        this.page.set(readPageBehind(state));
        this.resumed.set(resumesList(state));

        if (isHomePage(url)) {
          this.syncSearch(state);
        }
      } else if (
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.leaving = false;
        this.syncMenu(this.router.parseUrl(this.router.url));
      }
    });

    this.store
      .select(getSearchTerm)
      .pipe(skip(1))
      .subscribe((searchTerm) => {
        if (this.isMenuOpen() && !this.router.currentNavigation()) {
          this.saveSearch(searchTerm, this.location.getState());
        }
      });
  }

  open(): void {
    if (!this.isListShownOrPending()) {
      this.navigateToList(this.selectedTag(), true);
    }
  }

  showTag(tagId: number, { clearSearch = false } = {}): void {
    if (clearSearch) {
      this.store.dispatch(clearSearchAction());
    }

    this.navigateToList(tagId, false);
  }

  close(): void {
    if (this.page() && !this.leaving) {
      this.leaving = true;
      this.location.back();
    }
  }

  resetTag(): void {
    if (!this.selectedTag()) {
      return;
    }

    if (this.isListShownOrPending()) {
      this.showTag(0);
    } else {
      this.store.dispatch(setSelectedTagAction(0));
    }
  }

  takeChangedByHistory(): boolean {
    const changed = this.changedByHistory;

    this.changedByHistory = false;
    return changed;
  }

  toggle(): void {
    if (this.page()) {
      this.close();
    } else {
      this.open();
    }
  }

  private isListShownOrPending(): boolean {
    const pending = this.router.currentNavigation()?.extractedUrl;

    return pending ? isHomePage(pending) : this.isMenuOpen();
  }

  private navigateToList(tagId: number, resumed: boolean): void {
    const queryParams = tagId ? { [TAG_PARAM]: tagId } : {};
    const pending = this.router.currentNavigation();

    if (pending && isHomePage(pending.extractedUrl)) {
      this.router.navigate(['/'], {
        ...pending.extras,
        queryParams,
        state: { ...pending.extras.state, [RESUMED_STATE]: false, [SEARCH_STATE]: this.searchTerm() },
      });
      return;
    }

    if (this.isMenuOpen()) {
      const state = readHistoryState(this.location.getState());

      this.router.navigate(['/'], {
        queryParams,
        replaceUrl: true,
        state: { ...state, [RESUMED_STATE]: false, [SEARCH_STATE]: this.searchTerm() },
        scroll: 'manual',
      });
      return;
    }

    this.router.navigate(['/'], {
      queryParams,
      state: {
        [PAGE_BEHIND_STATE]: this.currentPage(),
        [RESUMED_STATE]: resumed,
        [SEARCH_STATE]: this.searchTerm(),
      },
      scroll: 'manual',
    });
  }

  private syncSearch(state: unknown): void {
    const saved = readHistoryState(state)[SEARCH_STATE];

    if (typeof saved !== 'string') {
      this.saveSearch(this.searchTerm(), state);
    } else if (saved !== this.searchTerm()) {
      this.changedByHistory ||= this.fromHistory;
      this.store.dispatch(setSearchTermAction(saved));
    }
  }

  private saveSearch(searchTerm: string, state: unknown): void {
    const current = readHistoryState(state);

    if (current[SEARCH_STATE] !== searchTerm) {
      this.location.replaceState(this.location.path(), '', { ...current, [SEARCH_STATE]: searchTerm });
    }
  }

  private syncMenu(url: UrlTree): void {
    const open = isHomePage(url);

    if (open !== this.isMenuOpen()) {
      this.store.dispatch(changeShowMenuAction(open));
    }
  }

  private syncTag(url: UrlTree): void {
    if (!isHomePage(url)) {
      return;
    }

    const tagId = Number(url.queryParamMap.get(TAG_PARAM));
    const known = SEARCH_FILTERS.some(({ id }) => id === tagId) ? tagId : 0;

    if (known !== this.selectedTag()) {
      this.changedByHistory ||= this.fromHistory;
      this.store.dispatch(setSelectedTagAction(known));
    }
  }

  private currentPage(): PageBehindList {
    let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    const isSong = !!route.routeConfig?.path?.startsWith('song/');

    return { songId: isSong ? Number(route.paramMap.get('id')) : null };
  }
}

function isHomePage(url: UrlTree): boolean {
  return !url.root.hasChildren();
}

function readHistoryState(state: unknown): Record<string, unknown> {
  return (state as Record<string, unknown> | null) ?? {};
}

function readPageBehind(state: unknown): PageBehindList | null {
  return (readHistoryState(state)[PAGE_BEHIND_STATE] as PageBehindList | undefined) ?? null;
}

export function resumesList(state: unknown): boolean {
  return readHistoryState(state)[RESUMED_STATE] === true;
}
