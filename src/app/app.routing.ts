import { Routes } from '@angular/router';
import { MainSoundComponent } from './application/main-sound/main-sound.component';
import { AboutComponent } from './components/about/about.component';
import { FavoriteComponent } from './components/favorite/favorite.component';
import { GadzinkiComponent } from './components/gadzinki/gadzinki.component';
import { LiturgyComponent } from './components/liturgy/liturgy.component';
import { LoginComponent } from './components/login/login.component';
import { MainPageComponent } from './components/main-page/main-page.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PaperGeneratorComponent } from './components/paper-generator/paper-generator.component';
import { PartOfMassComponent } from './components/part-of-mass/part-of-mass.component';
import { AddPlaylistComponent } from './components/playlist/add-playlist/add-playlist.component';
import { PlaylistComponent } from './components/playlist/playlist.component';
import { ViewPlaylistComponent } from './components/playlist/view-playlist/view-playlist.component';
import { SongDetailsComponent } from './components/song-details/song-details.component';
import { HasSongGuard } from './guards/has-song.guard';
import { UserService } from './services/user/user.service';
import { WakeLockService } from './services/wakelock/wake-lock.service';
import { playlistTitle, songTitle } from './services/page-title/page-title.strategy';

const soundRoutes: Routes = [
  { path: '', component: MainPageComponent, pathMatch: 'full' },
  {
    path: 'song/:id/:title',
    component: SongDetailsComponent,
    title: songTitle,
    canActivate: [HasSongGuard, WakeLockService],
    canDeactivate: [WakeLockService],
  },
  {
    path: 'song/:id',
    component: SongDetailsComponent,
    title: songTitle,
    canActivate: [HasSongGuard, WakeLockService],
    canDeactivate: [WakeLockService],
  },
  {
    path: 'playlist',
    children: [
      {
        path: '',
        component: PlaylistComponent,
        title: 'Плэйлісты',
        pathMatch: 'full',
      },
      {
        path: 'add',
        component: AddPlaylistComponent,
        title: 'Новы плэйліст',
      },
      {
        path: 'add/:songId',
        component: AddPlaylistComponent,
        title: 'Новы плэйліст',
      },
      {
        path: 'edit/:playlistId',
        component: AddPlaylistComponent,
        title: 'Рэдагаванне плэйліста',
      },
      {
        path: ':createdDate/:name',
        title: playlistTitle,
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
  { path: 'generator/docx', component: PaperGeneratorComponent, title: 'Папяровая версія' },
  { path: 'liturgy', component: LiturgyComponent, title: 'Чытанне дня' },
  { path: 'part-of-mass', component: PartOfMassComponent, title: 'Часткі імшы' },
  { path: 'favorite', component: FavoriteComponent, title: 'Закладкі' },
  { path: 'gadzinki', component: GadzinkiComponent, title: 'Гадзінкі' },
  { path: 'about', component: AboutComponent, title: 'Пра нас' },
  { path: 'login', component: LoginComponent, title: 'Уваход' },
  { path: '404', component: PageNotFoundComponent, title: 'Старонка не знойдзена' },
  {
    path: 'admin',
    title: 'Адміністраванне',
    loadChildren: () => import('./components/admin/admin.routes').then((m) => m.adminRoutes),
    canActivate: [UserService],
  },
  { path: '**', component: PageNotFoundComponent, title: 'Старонка не знойдзена' },
];

export const appRoutes: Routes = [
  {
    path: 'presentation',
    title: 'Прэзентацыя',
    loadChildren: () => import('./components/presentation/presentation.routes').then((m) => m.presentationRoutes),
  },
  { path: '', component: MainSoundComponent, children: soundRoutes },
];
