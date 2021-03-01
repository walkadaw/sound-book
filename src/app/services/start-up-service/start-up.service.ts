import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { setFavoriteAction } from '../../redux/actions/favorite.actions';
import { changeFontSizeAction, showChordAction, showSongNumberAction } from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { MatIconRegistryService } from '../mat-icon-registry-service/mat-icon-registry.service';
import { SongService } from '../song-service/song.service';

export const startUpFactory = (startUpService: StartUpService) => () => startUpService.load();

@Injectable({
  providedIn: 'root',
})
export class StartUpService {
  constructor(
    private matRegisterIcon: MatIconRegistryService,
    private songService: SongService,
    private store: Store<IAppState>
  ) {}

  load(): Promise<any> {
    return Promise.all([
      this.songService.loadSongs(),
      this.matRegisterIcon.register(),
      this.loadFavorite(),
      this.loadSettings(),
    ]);
  }

  loadFavorite(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (window.localStorage.getItem('favorite')) {
        const favorite = JSON.parse(window.localStorage.getItem('favorite'));
        this.store.dispatch(setFavoriteAction(favorite));
      }
      resolve();
    }).catch((e) => {
      console.log('Cant load favorite');
    });
  }

  loadSettings(): Promise<void> {
    return new Promise<void>((resolve) => {
      const fontSize = +window.localStorage.getItem('fontSize') || 1;
      const showChord = window.localStorage.getItem('showChord') === '1';
      const showSongNumber = window.localStorage.getItem('showSongNumber') === '1';

      this.store.dispatch(changeFontSizeAction(fontSize));
      this.store.dispatch(showChordAction(showChord));
      this.store.dispatch(showSongNumberAction(showSongNumber));
      resolve();
    }).catch((e) => {
      console.log('Cant load settings');
    });
  }
}
