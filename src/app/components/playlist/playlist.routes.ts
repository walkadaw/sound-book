import { Routes } from '@angular/router';

import { playlistTitle } from '../../services/page-title/page-title.strategy';
import { AddPlaylistComponent } from './add-playlist/add-playlist.component';
import { PlaylistComponent } from './playlist.component';
import { ViewPlaylistComponent } from './view-playlist/view-playlist.component';

export const playlistRoutes: Routes = [
  { path: '', component: PlaylistComponent, title: 'Плэйлісты', pathMatch: 'full' },
  { path: 'add', component: AddPlaylistComponent, title: 'Новы плэйліст' },
  { path: 'add/:songId', component: AddPlaylistComponent, title: 'Новы плэйліст' },
  { path: 'edit/:playlistId', component: AddPlaylistComponent, title: 'Рэдагаванне плэйліста' },
  {
    path: ':createdDate/:name',
    title: playlistTitle,
    children: [
      { path: '', component: ViewPlaylistComponent, pathMatch: 'full' },
      { path: ':songList', component: ViewPlaylistComponent },
    ],
  },
];
