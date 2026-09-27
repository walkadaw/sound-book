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
import { ChordPosition } from '../../redux/models/settings.state';
import { SettingsService } from '../../services/settings/settings.service';
import { SongService } from '../../services/song-service/song.service';
import { WakeLockService } from '../../services/wakelock/wake-lock.service';

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
  private settings = inject(SettingsService);
  private songService = inject(SongService);
  private snackBar = inject(MatSnackBar);

  protected wakeLockSupported = inject(WakeLockService).isSupported;

  protected showChord = this.settings.showChord;
  protected enableNoSleep = this.settings.enableNoSleep;
  protected showSongNumber = this.settings.showSongNumber;
  protected chordPosition = this.settings.chordPosition;
  private fontSize = this.settings.fontSize;

  protected fontSizePercent = computed(() => Math.round(this.fontSize() * 100));
  protected shortChord = computed(() => this.settings.chordNotation() === 'short');
  protected canDecrease = computed(() => this.fontSize() > MIN_FONT_SIZE);
  protected canIncrease = computed(() => this.fontSize() < MAX_FONT_SIZE);
  protected songVersion = signal(this.songService.songVersion);
  protected updating = signal(false);

  protected toggleNoSleep(event: MatSlideToggleChange): void {
    this.settings.setEnableNoSleep(event.checked);
  }

  protected toggleSongNumber(event: MatSlideToggleChange): void {
    this.settings.setShowSongNumber(event.checked);
  }

  protected toggleChord(event: MatSlideToggleChange): void {
    this.settings.setShowChord(event.checked);
  }

  protected changeChordPosition(event: MatButtonToggleChange): void {
    this.settings.setChordPosition(event.value as ChordPosition);
  }

  protected toggleShortChord(event: MatSlideToggleChange): void {
    this.settings.setChordNotation(event.checked ? 'short' : 'full');
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
    this.settings.setFontSize(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(next * 10) / 10)));
  }

  protected resetFontSize(): void {
    this.settings.setFontSize(DEFAULT_FONT_SIZE);
  }
}
