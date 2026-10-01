import { Component, computed, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { SettingsService } from '../../services/settings/settings.service';

const MIN_FONT_SIZE = 0.4;
const MAX_FONT_SIZE = 2;
const FONT_SIZE_STEP = 0.1;
const DEFAULT_FONT_SIZE = 1;

@Component({
  selector: 'app-song-view-settings',
  templateUrl: './song-view-settings.component.html',
  styleUrl: './song-view-settings.component.scss',
  imports: [MatIcon, MatIconButton, MatSlideToggle],
})
export class SongViewSettingsComponent {
  private settings = inject(SettingsService);

  protected showChord = this.settings.showChord;
  private fontSize = this.settings.fontSize;

  protected fontSizePercent = computed(() => Math.round(this.fontSize() * 100));
  protected shortChord = computed(() => this.settings.chordNotation() === 'short');
  protected canDecrease = computed(() => this.fontSize() > MIN_FONT_SIZE);
  protected canIncrease = computed(() => this.fontSize() < MAX_FONT_SIZE);

  protected toggleChord(event: MatSlideToggleChange): void {
    this.settings.setShowChord(event.checked);
  }

  protected toggleShortChord(event: MatSlideToggleChange): void {
    this.settings.setChordNotation(event.checked ? 'short' : 'full');
  }

  protected changeFontSize(direction: 1 | -1): void {
    const next = Math.round(this.fontSize() / FONT_SIZE_STEP + direction) * FONT_SIZE_STEP;
    this.settings.setFontSize(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(next * 10) / 10)));
  }

  protected resetFontSize(): void {
    this.settings.setFontSize(DEFAULT_FONT_SIZE);
  }
}
