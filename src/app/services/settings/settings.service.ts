import { Service, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  changeFontSizeAction,
  chordNotationAction,
  showChordAction,
} from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import {
  getChordNotation,
  getFontSize,
  getShowChord,
} from '../../redux/selector/settings.selector';
import { ChordNotation } from '../chord/chord.model';

@Service()
export class SettingsService {
  private store = inject<Store<IAppState>>(Store);

  readonly showChord = this.store.selectSignal(getShowChord);
  readonly chordNotation = this.store.selectSignal(getChordNotation);
  readonly fontSize = this.store.selectSignal(getFontSize);

  setShowChord(show: boolean): void {
    window.localStorage.setItem('showChord', show ? '1' : '0');
    this.store.dispatch(showChordAction(show));
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
