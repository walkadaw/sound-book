import { Routes } from '@angular/router';

import { AdminComponent } from './admin/admin.component';
import { EditComponent } from './edit/edit.component';
import { LoadSongResolver } from './edit/load-song.resolver';

export const adminRoutes: Routes = [
  {
    path: '',
    children: [
      { path: 'edit/:id', component: EditComponent, resolve: { song: LoadSongResolver } },
      { path: 'add', component: EditComponent },
      { path: '', component: AdminComponent, pathMatch: 'full' },
    ],
  },
];
