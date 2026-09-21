import { Component, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenuItem } from '@angular/material/menu';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  changeFontSizeAction,
  changeNoSleepAction,
  chordPositionAction,
  showChordAction,
  showSongNumberAction,
} from '../../redux/actions/settings.actions';
import { IAppState } from '../../redux/models/IAppState';
import { ChordPosition } from '../../redux/models/settings.state';
import {
  getChordPosition,
  getEnableNoSleep,
  getFontSize,
  getShowChord,
  getShowSongNumber,
} from '../../redux/selector/settings.selector';
import { SongService } from '../../services/song-service/song.service';

const MIN_FONT_SIZE = 0.4;
const MAX_FONT_SIZE = 2;
const FONT_SIZE_STEP = 0.1;
const DEFAULT_FONT_SIZE = 1;

@Component({
  selector: 'app-settings-menu',
  templateUrl: './settings-menu.component.html',
  styleUrl: './settings-menu.component.scss',
  imports: [
    DatePipe,
    MatButtonModule,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatDivider,
    MatIcon,
    MatMenuItem,
    MatSlideToggle,
    RouterLink,
  ],
})
export class SettingsMenuComponent {
  private store = inject<Store<IAppState>>(Store);
  private songService = inject(SongService);
  private snackBar = inject(MatSnackBar);

  protected showChord = this.store.selectSignal(getShowChord);
  protected enableNoSleep = this.store.selectSignal(getEnableNoSleep);
  protected showSongNumber = this.store.selectSignal(getShowSongNumber);
  protected chordPosition = this.store.selectSignal(getChordPosition);
  private fontSize = this.store.selectSignal(getFontSize);

  protected fontSizePercent = computed(() => Math.round(this.fontSize() * 100));
  protected canDecrease = computed(() => this.fontSize() > MIN_FONT_SIZE);
  protected canIncrease = computed(() => this.fontSize() < MAX_FONT_SIZE);
  protected songVersion = signal(this.songService.songVersion);
  protected updating = signal(false);

  protected toggleNoSleep(event: MatSlideToggleChange): void {
    window.localStorage.setItem('enableNoSleep', event.checked ? '1' : '0');
    this.store.dispatch(changeNoSleepAction(event.checked));
  }

  protected toggleSongNumber(event: MatSlideToggleChange): void {
    window.localStorage.setItem('showSongNumber', event.checked ? '1' : '0');
    this.store.dispatch(showSongNumberAction(event.checked));
  }

  protected toggleChord(event: MatSlideToggleChange): void {
    window.localStorage.setItem('showChord', event.checked ? '1' : '0');
    this.store.dispatch(showChordAction(event.checked));
  }

  protected changeChordPosition(event: MatButtonToggleChange): void {
    const position: ChordPosition = event.value;
    window.localStorage.setItem('chordPosition', position);
    this.store.dispatch(chordPositionAction(position));
  }

  protected updateSongs(event: MouseEvent): void {
    event.stopPropagation();
    this.updating.set(true);

    this.songService
      .loadSongs()
      .pipe(finalize(() => this.updating.set(false)))
      .subscribe({
        next: () => {
          this.songVersion.set(this.songService.songVersion);
          this.snackBar.open('Дадзеныя паспяхова абноўленыя', 'Зачыніць', { duration: 2000 });
        },
        error: () => this.snackBar.open('Адбылася памылка падчас абнаўлення', 'Зачыніць', { duration: 2000 }),
      });
  }

  protected changeFontSize(direction: 1 | -1): void {
    const next = Math.round(this.fontSize() / FONT_SIZE_STEP + direction) * FONT_SIZE_STEP;
    this.setFontSize(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(next * 10) / 10)));
  }

  protected resetFontSize(): void {
    this.setFontSize(DEFAULT_FONT_SIZE);
  }

  private setFontSize(fontSize: number): void {
    window.localStorage.setItem('fontSize', fontSize.toString());
    this.store.dispatch(changeFontSizeAction(fontSize));
  }
}
