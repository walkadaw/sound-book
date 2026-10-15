import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/list';
import { ALL_TAGS, SEARCH_FILTERS } from '../../constants/tag-list';
import { IAppState } from '../../redux/models/IAppState';
import { getSelectedTag } from '../../redux/selector/search.selector';
import { PlayList } from '../../services/playlist/playlist.service';
import { SongListService } from '../../services/song-list/song-list.service';
import { UserService } from '../../services/user/user.service';
import { SongSearchComponent } from '../song-search/song-search.component';
import { PlaylistMenuComponent } from '../playlist/playlist-menu/playlist-menu.component';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';
import { SubmenuGhostClickGuardDirective } from '../../directives/submenu-ghost-click-guard.directive';

const SCROLL_EDGE_TOLERANCE_PX = 1;

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
    SubmenuGhostClickGuardDirective,
  ],
  host: {
    role: 'banner',
    '(keydown.escape)': 'closePanel($event)',
  },
})
export class HeaderComponent {
  private userService = inject(UserService);
  private store = inject<Store<IAppState>>(Store);
  private router = inject(Router);

  private songSearch = viewChild.required(SongSearchComponent);
  private chipScroll = viewChild<ElementRef<HTMLElement>>('chipScroll');

  private selectedTagId = this.store.selectSignal(getSelectedTag);

  protected songList = inject(SongListService);
  protected isAuth = this.userService.isAuth;
  protected readonly filters = SEARCH_FILTERS;
  protected readonly selectedFilter = computed(
    () => this.filters.find((item) => item.id === this.selectedTagId()) ?? ALL_TAGS,
  );

  protected readonly canScrollLeft = signal(false);
  protected readonly canScrollRight = signal(false);
  private chipScrollTicking = false;

  searchInputInFocus = false;

  protected showAllSongs(): void {
    this.songList.showTag(0, { clearSearch: true });
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
    this.songList.showTag(filterId);
    this.songSearch().focusSearch();
  }

  protected closePanel(event: Event): void {
    event.stopPropagation();
    (document.activeElement as HTMLElement | null)?.blur();
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
