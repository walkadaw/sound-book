import { Routes } from '@angular/router';

import { AdminComponent } from './admin/admin.component';
import { DuplicatesComponent } from './duplicates/duplicates.component';
import { EditComponent } from './edit/edit.component';
import { LoadSongResolver } from './edit/load-song.resolver';
import { PopularComponent } from './popular/popular.component';
import { SongCheckComponent } from './song-check/song-check.component';

export const adminRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'edit/:id', component: EditComponent, resolve: { song: LoadSongResolver } },
      { path: 'add', component: EditComponent },
      { path: 'popular', component: PopularComponent, title: 'Популярные песни' },
      { path: 'duplicates', component: DuplicatesComponent, title: 'Похожие песни' },
      {
        path: 'check/no-chords',
        component: SongCheckComponent,
        data: { check: 'no-chords' },
        title: 'Песни без аккордов',
      },
      {
        path: 'check/chord-mistakes',
        component: SongCheckComponent,
        data: { check: 'chord-mistakes' },
        title: 'Нераспознанные аккорды',
      },
      {
        path: 'check/chord-notations',
        component: SongCheckComponent,
        data: { check: 'chord-notations' },
        title: 'Неподдерживаемые пометки',
      },
      { path: 'check/no-tags', component: SongCheckComponent, data: { check: 'no-tags' }, title: 'Песни без тегов' },
      { path: '', component: AdminComponent, pathMatch: 'full' },
    ],
  },
];
