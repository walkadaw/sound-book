import { Routes } from '@angular/router';
import { SongDetailsComponent } from './component/song-details/song-details.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

export const appRoutes: Routes = [
  { path: 'song', component: SongDetailsComponent },
  { path: '**', component: PageNotFoundComponent },
];
