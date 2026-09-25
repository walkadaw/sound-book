import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/list';
import { ALL_TAGS, SEARCH_FILTERS } from '../../constants/tag-list';
import { clearSearchAction, setSelectedTagAction } from '../../redux/actions/search.actions';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getSelectedTag } from '../../redux/selector/search.selector';
import { getShowMenu } from '../../redux/selector/settings.selector';
import { PlayList } from '../../services/playlist/playlist.service';
import { UserService } from '../../services/user/user.service';
import { SongSearchComponent } from '../song-search/song-search.component';
import { PlaylistMenuComponent } from '../playlist/playlist-menu/playlist-menu.component';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';

const SCROLL_EDGE_TOLERANCE_PX = 1;
const SUBMENU_OPEN_GUARD_MS = 400;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [
    MatIcon,
    MatMenuTrigger,
    SongSearchComponent,
    MatMenu,
    MatMenuItem,
    MatDivider,
    RouterLink,
    PlaylistMenuComponent,
    SettingsMenuComponent,
  ],
  host: {
    '(keydown.escape)': 'closePanel()',
  },
})
export class HeaderComponent {
  private userService = inject(UserService);
  private store = inject<Store<IAppState>>(Store);
  private router = inject(Router);

  private songSearch = viewChild.required(SongSearchComponent);
  private chipScroll = viewChild<ElementRef<HTMLElement>>('chipScroll');

  private showMenu = this.store.selectSignal(getShowMenu);
  private selectedTagId = this.store.selectSignal(getSelectedTag);

  protected isAuth = this.userService.isAuth;
  protected readonly filters = SEARCH_FILTERS;
  protected readonly selectedFilter = computed(
    () => this.filters.find((item) => item.id === this.selectedTagId()) ?? ALL_TAGS,
  );

  protected readonly canScrollLeft = signal(false);
  protected readonly canScrollRight = signal(false);
  private chipScrollTicking = false;

  searchInputInFocus = false;

  protected readonly submenuOpening = signal(false);
  private submenuOpenGuardTimeout?: ReturnType<typeof setTimeout>;

  toggleMainMenu(show?: boolean) {
    const toggle = this.showMenu();

    if (show) {
      this.store.dispatch(clearSearchAction());

      if (show === toggle) {
        return;
      }
    }

    this.store.dispatch(changeShowMenuAction(!toggle));
  }

  onInputChangeFocus(isFocus: boolean) {
    this.searchInputInFocus = isFocus;

    if (isFocus) {
      // The panel's grid-template-rows/visibility reveal is a side effect of this same focus
      // change, so its scroll metrics are only measurable once that CSS update has applied.
      setTimeout(() => this.onChipScroll());
    }
  }

  goToPlaylist(playlist: PlayList) {
    this.router.navigate(['/playlist', playlist.dateCreate, playlist.name, playlist.songList.join(',')]);
  }

  protected selectFilter(filterId: number): void {
    this.store.dispatch(setSelectedTagAction(filterId));
    this.songSearch().focusSearch();
  }

  protected closePanel(): void {
    (document.activeElement as HTMLElement | null)?.blur();
  }

  protected onSubmenuOpened(): void {
    // On touch devices the tap that opens a submenu can also register on whatever submenu
    // item ends up rendered under the same finger position, triggering an unintended click.
    // Briefly ignore pointer events on the freshly opened panel to swallow that ghost click.
    clearTimeout(this.submenuOpenGuardTimeout);
    this.submenuOpening.set(true);
    this.submenuOpenGuardTimeout = setTimeout(() => this.submenuOpening.set(false), SUBMENU_OPEN_GUARD_MS);
  }

  protected onChipScroll(): void {
    if (this.chipScrollTicking) {
      return;
    }

    this.chipScrollTicking = true;
    requestAnimationFrame(() => {
      this.chipScrollTicking = false;
      this.updateChipScrollFade();
    });
  }

  private updateChipScrollFade(): void {
    const el = this.chipScroll()?.nativeElement;

    if (!el) {
      return;
    }

    this.canScrollLeft.set(el.scrollLeft > SCROLL_EDGE_TOLERANCE_PX);
    this.canScrollRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - SCROLL_EDGE_TOLERANCE_PX);
  }
}
