import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { SongChecksService } from '../song-checks.service';

const SONG_PLURAL = new Intl.PluralRules('ru');
const SONG_WORD: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'песня', few: 'песни', many: 'песен' };

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  imports: [MatButton, RouterLink],
})
export class AdminComponent {
  protected readonly checks = inject(SongChecksService).checks;

  protected songsWord(count: number): string {
    return SONG_WORD[SONG_PLURAL.select(count)] ?? 'песен';
  }
}
