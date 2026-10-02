import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminPageHeaderComponent } from '../admin-page-header/admin-page-header.component';
import { ChordIssuesComponent } from '../chord-issues/chord-issues.component';
import { SongCheckKey, SongChecksService } from '../song-checks.service';

@Component({
  selector: 'app-song-check',
  imports: [RouterLink, AdminPageHeaderComponent, ChordIssuesComponent],
  template: `
    @if (check; as check) {
      <app-admin-page-header [title]="check.title">
        <p class="description">{{ check.description }}</p>
      </app-admin-page-header>

      @if (check.items().length) {
        <p>Найдено песен: {{ check.items().length }}</p>
        <ul class="songs">
          @for (item of check.items(); track item.song.id) {
            <li>
              <a [routerLink]="['/admin/edit', item.song.id]">{{ item.song.title }}</a>
              @if (item.issues.length) {
                <app-chord-issues [issues]="item.issues" />
              }
              @if (item.notes?.length) {
                <ul>
                  @for (note of item.notes; track $index) {
                    <li>{{ note }}</li>
                  }
                </ul>
              }
            </li>
          }
        </ul>
      } @else {
        <p>Всё в порядке — таких песен нет</p>
      }
    }
  `,
  styles: `
    .description {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }

    .songs li {
      margin-bottom: 8px;
    }
  `,
})
export class SongCheckComponent {
  protected readonly check = inject(SongChecksService).getCheck(
    inject(ActivatedRoute).snapshot.data['check'] as SongCheckKey,
  );
}
