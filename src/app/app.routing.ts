import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainSoundComponent } from './application/main-sound/main-sound.component';
import { AboutComponent } from './components/about/about.component';
import { FavoriteComponent } from './components/favorite/favorite.component';
import { GadzinkiComponent } from './components/gadzinki/gadzinki.component';
import { LiturgyComponent } from './components/liturgy/liturgy.component';
import { LoginComponent } from './components/login/login.component';
import { MainPageComponent } from './components/main-page/main-page.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PaperGeneratorComponent } from './components/paper-generator/paper-generator.component';
import { AddPlaylistComponent } from './components/playlist/add-playlist/add-playlist.component';
import { PlaylistComponent } from './components/playlist/playlist.component';
import { ViewPlaylistComponent } from './components/playlist/view-playlist/view-playlist.component';
import { SongDetailsComponent } from './components/song-details/song-details.component';
import { HasSongGuard } from './guards/has-song.guard';
import { UserService } from './services/user/user.service';
import { WakeLockService } from './services/wakelock/wake-lock.service';

const soundRoutes: Routes = [
  { path: '', component: MainPageComponent, pathMatch: 'full' },
  {
    path: 'song/:id/:title',
    component: SongDetailsComponent,
    canActivate: [HasSongGuard, WakeLockService],
    canDeactivate: [WakeLockService],
  },
  {
    path: 'song/:id',
    component: SongDetailsComponent,
    canActivate: [HasSongGuard, WakeLockService],
    canDeactivate: [WakeLockService],
  },
  {
    path: 'playlist',
    children: [
      {
        path: '',
        component: PlaylistComponent,
        pathMatch: 'full',
      },
      {
        path: 'add',
        component: AddPlaylistComponent,
      },
      {
        path: 'add/:songId',
        component: AddPlaylistComponent,
      },
      {
        path: 'edit/:playlistId',
        component: AddPlaylistComponent,
      },
      {
        path: ':createdDate/:name',
        children: [
          {
            path: '',
            component: ViewPlaylistComponent,
            pathMatch: 'full',
          },
          {
            path: ':songList',
            component: ViewPlaylistComponent,
          },
        ],
      },
    ],
  },
  { path: 'generator/docx', component: PaperGeneratorComponent },
  { path: 'liturgy', component: LiturgyComponent },
  { path: 'favorite', component: FavoriteComponent },
  { path: 'gadzinki', component: GadzinkiComponent },
  { path: 'about', component: AboutComponent },
  { path: 'login', component: LoginComponent },
  { path: '404', component: PageNotFoundComponent },
  {
    path: 'admin',
    loadChildren: () => import('./components/admin/admin.module').then((m) => m.AdminModule),
    canActivate: [UserService],
  },
  { path: '**', component: PageNotFoundComponent },
];

const appRoutes: Routes = [
  {
    path: 'presentation',
    loadChildren: () => import('./components/presentation/presentation.module').then((m) => m.PresentationModule),
  },
  { path: '', component: MainSoundComponent, children: soundRoutes },
];

@NgModule({
  imports: [
    RouterModule.forRoot(appRoutes, {
      scrollPositionRestoration: 'enabled',
      onSameUrlNavigation: 'reload',
      relativeLinkResolution: 'legacy',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
