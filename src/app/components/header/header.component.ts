import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/list';
import { AsyncPipe } from '@angular/common';
import { clearSearchAction } from '../../redux/actions/search.actions';
import { changeShowMenuAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { getShowMenu } from '../../redux/selector/settings.selector';
import { PlayList } from '../../services/playlist/playlist.service';
import { UserService } from '../../services/user/user.service';
import { getCurrentValue } from '../utils/redux.utils';
import { SongSearchComponent } from '../song-search/song-search.component';
import { PlaylistMenuComponent } from '../playlist/playlist-menu/playlist-menu.component';
import { SettingsMenuComponent } from '../settings-menu/settings-menu.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    AsyncPipe,
  ],
})
export class HeaderComponent {
  private userService = inject(UserService);
  private store = inject<Store<IAppState>>(Store);
  private router = inject(Router);

  isAuth$ = this.userService.isAuth$;

  searchInputInFocus = false;

  toggleMainMenu(show?: boolean) {
    const toggle = getCurrentValue(this.store, getShowMenu);

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
  }

  goToPlaylist(playlist: PlayList) {
    this.router.navigate(['/playlist', playlist.dateCreate, playlist.name, playlist.songList.join(',')]);
  }
}
