import { Service, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  changeFontSizeAction,
  changeNoSleepAction,
  chordNotationAction,
  chordPositionAction,
  showChordAction,
  showSongNumberAction,
} from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { ChordPosition } from '../../redux/models/settings.state';
import {
  getChordNotation,
  getChordPosition,
  getEnableNoSleep,
  getFontSize,
  getShowChord,
  getShowSongNumber,
} from '../../redux/selector/settings.selector';
import { ChordNotation } from '../chord/chord.model';

@Service()
export class SettingsService {
  private store = inject<Store<IAppState>>(Store);

  readonly showChord = this.store.selectSignal(getShowChord);
  readonly enableNoSleep = this.store.selectSignal(getEnableNoSleep);
  readonly showSongNumber = this.store.selectSignal(getShowSongNumber);
  readonly chordPosition = this.store.selectSignal(getChordPosition);
  readonly chordNotation = this.store.selectSignal(getChordNotation);
  readonly fontSize = this.store.selectSignal(getFontSize);

  setEnableNoSleep(enabled: boolean): void {
    window.localStorage.setItem('enableNoSleep', enabled ? '1' : '0');
    this.store.dispatch(changeNoSleepAction(enabled));
  }

  setShowSongNumber(show: boolean): void {
    window.localStorage.setItem('showSongNumber', show ? '1' : '0');
    this.store.dispatch(showSongNumberAction(show));
  }

  setShowChord(show: boolean): void {
    window.localStorage.setItem('showChord', show ? '1' : '0');
    this.store.dispatch(showChordAction(show));
  }

  setChordPosition(position: ChordPosition): void {
    window.localStorage.setItem('chordPosition', position);
    this.store.dispatch(chordPositionAction(position));
  }

  setChordNotation(notation: ChordNotation): void {
    window.localStorage.setItem('chordNotation', notation);
    this.store.dispatch(chordNotationAction(notation));
  }

  setFontSize(fontSize: number): void {
    window.localStorage.setItem('fontSize', fontSize.toString());
    this.store.dispatch(changeFontSizeAction(fontSize));
  }
}
