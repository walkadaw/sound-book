import { Service, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { setFavoriteAction } from '../../redux/actions/favorite.actions';
import {
  changeFontSizeAction,
  changeShowMenuAction,
  chordNotationAction,
  showChordAction,
} from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { ChordNotation } from '../chord/chord.model';
import { MatIconRegistryService } from '../mat-icon-registry-service/mat-icon-registry.service';
import { SongService } from '../song-service/song.service';
import { UserService } from '../user/user.service';

@Service()
export class StartUpService {
  private matRegisterIcon = inject(MatIconRegistryService);
  private songService = inject(SongService);
  private userService = inject(UserService);
  private store = inject<Store<IAppState>>(Store);

  async load(): Promise<void> {
    await Promise.all([
      firstValueFrom(this.songService.loadSongFromCache()),
      this.matRegisterIcon.register(),
      this.loadFavorite(),
      this.loadSettings(),
      firstValueFrom(this.userService.isLoginIn()),
    ]);

    firstValueFrom(this.songService.loadSongs());
    this.keepOfflineData();
  }

  private keepOfflineData(): void {
    // Firefox asks the user for this, so only the installed app asks, not every visitor of the site.
    if (!window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    navigator.storage
      ?.persisted?.()
      .then((persisted) => persisted || navigator.storage.persist())
      .catch(() => {});
  }

  loadFavorite(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (window.localStorage.getItem('favorite')) {
        const favorite = JSON.parse(window.localStorage.getItem('favorite'));

        if (Array.isArray(favorite)) {
          this.store.dispatch(setFavoriteAction(favorite));
        }
      }
      resolve();
    }).catch(() => {
      console.log('Cant load favorite');
    });
  }

  loadSettings(): Promise<void> {
    return new Promise<void>((resolve) => {
      const fontSize = +window.localStorage.getItem('fontSize') || 1;
      const showChord = window.localStorage.getItem('showChord') !== '0';
      const chordNotation: ChordNotation = window.localStorage.getItem('chordNotation') === 'short' ? 'short' : 'full';
      const showMenu = window.location.pathname === '/';

      this.store.dispatch(changeFontSizeAction(fontSize));
      this.store.dispatch(showChordAction(showChord));
      this.store.dispatch(chordNotationAction(chordNotation));
      this.store.dispatch(changeShowMenuAction(showMenu));
      resolve();
    }).catch(() => {
      console.log('Cant load settings');
    });
  }
}
