import { Component, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenuItem } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { SongService } from '../../services/song-service/song.service';
import { SongViewSettingsComponent } from '../song-view-settings/song-view-settings.component';

@Component({
  selector: 'app-settings-menu',
  templateUrl: './settings-menu.component.html',
  styleUrl: './settings-menu.component.scss',
  imports: [
    DatePipe,
    MatButtonModule,
    MatDivider,
    MatIcon,
    MatMenuItem,
    RouterLink,
    SongViewSettingsComponent,
  ],
})
export class SettingsMenuComponent {
  private songService = inject(SongService);
  private snackBar = inject(MatSnackBar);

  protected songVersion = signal(this.songService.songVersion);
  protected updating = signal(false);

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
}
