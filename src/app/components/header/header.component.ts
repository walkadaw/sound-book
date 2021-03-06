import { Component } from '@angular/core';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { clearSearchAction } from '../../redux/actions/search.actions';
import {
  changeFontSizeAction,
  changeShowMenuAction,
  chordPositionAction,
  showChordAction,
  showSongNumberAction,
} from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import {
  getChordPosition,
  getFontSize,
  getShowChord,
  getShowMenu,
  getShowSongNumber,
} from '../../redux/selector/settings.selector';
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
  chordPosition = getCurrentValue(this.store, getChordPosition);
  showSongNumber = getCurrentValue(this.store, getShowSongNumber);
  fontSize = Math.floor(getCurrentValue(this.store, getFontSize) * 100);

  searchInputInFocus: boolean = false;

  constructor(public songService: SongService, private store: Store<IAppState>, private snackBar: MatSnackBar) {}

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

    Promise.all([this.songService.loadSongs(true), this.songService.loadSlideSongs(true)])
      .then(() => {
        this.snackBar.open('???????????????? ?????????????????? ????????????????????', '????????????????', {
          duration: 2000,
        });
      })
      .catch(() => {
        this.snackBar.open('???????????????? ?????????????? ???????????? ????????????????????', '????????????????', {
          duration: 2000,
        });
      });
  }
}
