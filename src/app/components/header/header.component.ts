import { Component } from '@angular/core';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, EMPTY } from 'rxjs';
import { clearSearchAction } from '../../redux/actions/search.actions';
import {
  changeFontSizeAction,
  changeNoSleepAction,
  changeShowMenuAction,
  chordPositionAction,
  showChordAction,
  showSongNumberAction,
} from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import {
  getChordPosition, getEnableNoSleep, getFontSize, getShowChord,
  getShowMenu,
  getShowSongNumber,
} from '../../redux/selector/settings.selector';
import { PlayList } from '../../services/playlist/playlist.service';
import { SongService } from '../../services/song-service/song.service';
import { getCurrentValue } from '../utils/redux.utils';

const MIN_FONT_SIZE = 0.4;
const MAX_FONT_SIZE = 2;
const DEFAULT_FONT_SIZE = 1;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  showChord = getCurrentValue(this.store, getShowChord);
  enableNoSleep = getCurrentValue(this.store, getEnableNoSleep);
  chordPosition = getCurrentValue(this.store, getChordPosition);
  showSongNumber = getCurrentValue(this.store, getShowSongNumber);
  fontSize = Math.floor(getCurrentValue(this.store, getFontSize) * 100);

  searchInputInFocus = false;

  constructor(
    public songService: SongService,
    private store: Store<IAppState>,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  toggleSongNumber(event: MatCheckboxChange): void {
    this.showSongNumber = event.checked;
    window.localStorage.setItem('showSongNumber', this.showSongNumber ? '1' : '0');
    this.store.dispatch(showSongNumberAction(this.showSongNumber));
  }

  toggleChord(event: MatCheckboxChange): void {
    this.showChord = event.checked;
    window.localStorage.setItem('showChord', this.showChord ? '1' : '0');
    this.store.dispatch(showChordAction(this.showChord));
  }

  toggleNoSleep(event: MatCheckboxChange): void {
    this.enableNoSleep = event.checked;
    window.localStorage.setItem('enableNoSleep', this.enableNoSleep ? '1' : '0');
    this.store.dispatch(changeNoSleepAction(this.enableNoSleep));
  }

  changeFontSize(plus: boolean, defaultSize = false) {
    const acc = plus ? 1 : -1;
    let newFontSize = Math.floor(getCurrentValue(this.store, getFontSize) * 10 + acc) / 10;
    if (newFontSize < MIN_FONT_SIZE) {
      newFontSize = MIN_FONT_SIZE;
    }

    if (newFontSize > MAX_FONT_SIZE) {
      newFontSize = MAX_FONT_SIZE;
    }

    if (defaultSize) {
      newFontSize = DEFAULT_FONT_SIZE;
    }

    this.fontSize = Math.floor(newFontSize * 100);
    window.localStorage.setItem('fontSize', newFontSize.toString());
    this.store.dispatch(changeFontSizeAction(newFontSize));
  }

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

  changeChordPosition(event: MatButtonToggleChange) {
    window.localStorage.setItem('chordPosition', event.value);
    this.store.dispatch(chordPositionAction(event.value));
  }

  onInputChangeFocus(isFocus: boolean) {
    this.searchInputInFocus = isFocus;
  }

  updateSong(event: MouseEvent) {
    event.preventDefault();

    this.songService.loadSongs().pipe(
      catchError(() => {
        this.snackBar.open('Адбылася памылка падчас абнаўлення', 'Зачыніць', {
          duration: 2000,
        });

        return EMPTY;
      }),
    ).subscribe(() => {
      this.snackBar.open('Дадзеныя паспяхова абноўленыя', 'Зачыніць', {
        duration: 2000,
      });
    });
  }

  goToPlaylist(playlist: PlayList) {
    this.router.navigate(['/playlist', playlist.dateCreate, playlist.name, playlist.songList.join(',')]);
  }
}
