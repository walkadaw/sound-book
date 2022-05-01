import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { setFavoriteAction } from '../../redux/actions/favorite.actions';
import {
  changeFontSizeAction,
  changeNoSleepAction,
  changeShowMenuAction,
  chordPositionAction,
  showChordAction,
  showSongNumberAction,
} from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { ChordPosition } from '../../redux/models/settings.state';
import { MatIconRegistryService } from '../mat-icon-registry-service/mat-icon-registry.service';
import { SongService } from '../song-service/song.service';
import { UserService } from '../user/user.service';

@Injectable({
  providedIn: 'root',
})
export class StartUpService {
  constructor(
    private matRegisterIcon: MatIconRegistryService,
    private songService: SongService,
    private userService: UserService,
    private store: Store<IAppState>,
  ) {}

  async load(): Promise<void> {
    await Promise.all([
      firstValueFrom(this.songService.loadSongFromCache()),
      this.matRegisterIcon.register(),
      this.loadFavorite(),
      this.loadSettings(),
      firstValueFrom(this.userService.isLoginIn()),
    ]);

    firstValueFrom(this.songService.loadSongs());
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
    function defaultChordPosition(): ChordPosition {
      return window.innerWidth > 468 ? 'right' : 'inText';
    }

    return new Promise<void>((resolve) => {
      const fontSize = +window.localStorage.getItem('fontSize') || 1;
      const showChord = window.localStorage.getItem('showChord') === '1';
      const chordPosition = (window.localStorage.getItem('chordPosition') as ChordPosition) || defaultChordPosition();
      const showSongNumber = window.localStorage.getItem('showSongNumber') === '1';
      const enabledNoSleep = window.localStorage.getItem('enableNoSleep') === '1';
      const showMenu = window.location.pathname === '/';

      this.store.dispatch(changeFontSizeAction(fontSize));
      this.store.dispatch(showChordAction(showChord));
      this.store.dispatch(chordPositionAction(chordPosition));
      this.store.dispatch(showSongNumberAction(showSongNumber));
      this.store.dispatch(changeShowMenuAction(showMenu));
      this.store.dispatch(changeNoSleepAction(enabledNoSleep));
      resolve();
    }).catch(() => {
      console.log('Cant load settings');
    });
  }
}

export const startUpFactory = (startUpService: StartUpService) => () => startUpService.load();
