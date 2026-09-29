import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SongService } from '../../../services/song-service/song.service';

interface SongUsage {
  id: number;
  view: number;
  showP: number;
  favorite: number;
}

type SortKey = 'view' | 'showP' | 'favorite' | 'total';

interface PopularSong extends SongUsage {
  title: string;
  total: number;
}

@Component({
  selector: 'app-popular',
  templateUrl: './popular.component.html',
  styleUrls: ['./popular.component.scss'],
  imports: [RouterLink],
})
export class PopularComponent {
  private songService = inject(SongService);

  protected readonly columns: { key: SortKey; label: string }[] = [
    { key: 'view', label: 'Просмотры' },
    { key: 'showP', label: 'В презентации' },
    { key: 'favorite', label: 'В избранном' },
    { key: 'total', label: 'Всего' },
  ];

  protected readonly sortBy = signal<SortKey>('total');

  protected readonly usage = httpResource<SongUsage[]>(() => `${environment.baseUrl}/song/popular`, {
    defaultValue: [],
  });

  protected readonly songs = computed<PopularSong[]>(() => {
    const key = this.sortBy();

    return (
      this.usage
        .value()
        // A song deleted since it was counted has nothing to link to.
        .filter((item) => this.songService.hasSong(item.id))
        .map((item) => ({
          ...item,
          title: this.songService.getSong(item.id).title,
          total: item.view + item.showP,
        }))
        .sort((a, b) => b[key] - a[key] || a.title.localeCompare(b.title))
    );
  });
}
