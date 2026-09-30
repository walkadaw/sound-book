import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Song } from '../../../interfaces/song';
import { SongService } from '../../../services/song-service/song.service';
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component';
import { DuplicatesRequest, DuplicatesResponse } from './duplicates.model';

interface SongDuplicates {
  song: Song;
  similar: Song[];
}

type CheckStatus = 'idle' | 'loading' | 'done' | 'error';

@Component({
  selector: 'app-duplicates',
  imports: [MatButton, MatProgressSpinner, RouterLink, AdminPageHeaderComponent],
  template: `
    <app-admin-page-header title="Похожие песни">
      <p class="description">Пары песен с почти одинаковым текстом — возможно, одна из них лишняя</p>
    </app-admin-page-header>

    <div role="status">
      @switch (status()) {
        @case ('loading') {
          <div class="loading">
            <mat-spinner diameter="32" aria-hidden="true" />
            Сравниваем тексты песен…
          </div>
        }
        @case ('done') {
          @if (!duplicates().length) {
            <p>Похожих песен не найдено</p>
          }
        }
        @case ('error') {
          <p>Не удалось проверить песни</p>
        }
      }
    </div>

    @if (status() === 'idle' || status() === 'error') {
      <button mat-flat-button type="button" (click)="check()">Проверить</button>
    }

    @if (duplicates().length) {
      <ul class="songs">
        @for (item of duplicates(); track item.song.id) {
          <li>
            <a [routerLink]="['/song', item.song.id]">{{ item.song.title }}</a>
            похожа на
            @for (similar of item.similar; track similar.id; let last = $last) {
              <a [routerLink]="['/song', similar.id]">{{ similar.title }}</a
              >{{ last ? '' : ', ' }}
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .description {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }

    .loading {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .songs li {
      margin-bottom: 8px;
    }
  `,
})
export class DuplicatesComponent {
  private songService = inject(SongService);

  protected readonly status = signal<CheckStatus>('idle');
  protected readonly duplicates = signal<SongDuplicates[]>([]);

  private worker?: Worker;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.worker?.terminate());
  }

  check() {
    this.status.set('loading');
    // Comparing every pair of songs takes seconds, so it runs off the main thread to keep the page responsive
    this.worker = new Worker(new URL('./duplicates.worker', import.meta.url), { type: 'module' });

    this.worker.onmessage = ({ data }: MessageEvent<DuplicatesResponse[]>) => {
      this.duplicates.set(
        data.map((item) => ({
          song: this.songService.getSong(item.id),
          similar: item.similarIds.map((id) => this.songService.getSong(id)),
        })),
      );
      this.status.set('done');
      this.stopWorker();
    };

    this.worker.onerror = () => {
      this.status.set('error');
      this.stopWorker();
    };

    const request: DuplicatesRequest[] = this.songService.songList().map(({ id, text }) => ({ id, text }));
    this.worker.postMessage(request);
  }

  private stopWorker() {
    this.worker?.terminate();
    this.worker = undefined;
  }
}
