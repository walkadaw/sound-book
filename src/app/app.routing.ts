import { Routes } from '@angular/router';
import { MainSoundComponent } from './application/main-sound/main-sound.component';
import { MainPageComponent } from './components/main-page/main-page.component';
import { AboutComponent } from './components/about/about.component';
import { FavoriteComponent } from './components/favorite/favorite.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PartOfMassComponent } from './components/part-of-mass/part-of-mass.component';
import { SongDetailsComponent } from './components/song-details/song-details.component';
import { hasSongGuard } from './guards/has-song.guard';
import { shareTargetGuard } from './guards/share-target.guard';
import { UserService } from './services/user/user.service';
import { songTitle } from './services/page-title/page-title.strategy';

export const appRoutes: Routes = [
  {
    path: 'presentation',
    title: 'Прэзентацыя',
    loadChildren: () => import('./components/presentation/presentation.routes').then((m) => m.presentationRoutes),
  },
  {
    // the remote in a window beside the presentation, over the browser's own channel
    path: 'remote/window/:presentation',
    title: 'Кіраванне',
    data: { window: true },
    loadComponent: () =>
      import('./components/remote-control/remote-control.component').then((m) => m.RemoteControlComponent),
  },
  {
    path: 'remote/:room',
    title: 'Пульт',
    loadComponent: () =>
      import('./components/remote-control/remote-control.component').then((m) => m.RemoteControlComponent),
    data: { wakeLock: true },
  },
  {
    path: '',
    component: MainSoundComponent,
    children: [
      { path: '', component: MainPageComponent, pathMatch: 'full' },
      {
        path: 'song/:id/:title',
        component: SongDetailsComponent,
        title: songTitle,
        canActivate: [hasSongGuard],
        data: { wakeLock: true },
      },
      {
        path: 'song/:id',
        component: SongDetailsComponent,
        title: songTitle,
        canActivate: [hasSongGuard],
        data: { wakeLock: true },
      },
      {
        path: 'playlist',
        loadChildren: () => import('./components/playlist/playlist.routes').then((m) => m.playlistRoutes),
      },
      {
        path: 'generator/docx',
        loadComponent: () =>
          import('./components/paper-generator/paper-generator.component').then((m) => m.PaperGeneratorComponent),
        title: 'Папяровая версія',
      },
      {
        path: 'liturgy',
        loadComponent: () => import('./components/liturgy/liturgy.component').then((m) => m.LiturgyComponent),
        title: 'Чытанне дня',
      },
      // Never renders: the guard always redirects, the component is only there because a route needs one.
      { path: 'share', component: PageNotFoundComponent, canActivate: [shareTargetGuard] },
      {
        path: 'part-of-mass',
        component: PartOfMassComponent,
        title: 'Часткі імшы',
        data: { wakeLock: true },
      },
      { path: 'favorite', component: FavoriteComponent, title: 'Закладкі' },
      {
        path: 'gadzinki',
        loadComponent: () => import('./components/gadzinki/gadzinki.component').then((m) => m.GadzinkiComponent),
        title: 'Гадзінкі',
        data: { wakeLock: true },
      },
      { path: 'about', component: AboutComponent, title: 'Пра нас' },
      {
        path: 'login',
        loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent),
        title: 'Уваход',
      },
      {
        path: 'admin',
        title: 'Адміністраванне',
        loadChildren: () => import('./components/admin/admin.routes').then((m) => m.adminRoutes),
        canActivate: [UserService],
      },
      { path: '**', component: PageNotFoundComponent, title: 'Старонка не знойдзена' },
    ],
  },
];
