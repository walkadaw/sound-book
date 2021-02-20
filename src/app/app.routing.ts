import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SongDetailsComponent } from './components/song-details/song-details.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { MainPageComponent } from './components/main-page/main-page.component';
import { LiturgyComponent } from './components/liturgy/liturgy.component';
import { HasSongGuard } from './guards/has-song.guard';
import { PaperGeneratorComponent } from './components/paper-generator/paper-generator.component';
import { MainSoundComponent } from './application/main-sound/main-sound.component';
import { FavoriteComponent } from './components/favorite/favorite.component';

const soundRoutes: Routes = [
  { path: 'song/:id/:title', component: SongDetailsComponent, canActivate: [HasSongGuard] },
  { path: 'song/:id', component: SongDetailsComponent, canActivate: [HasSongGuard] },
  { path: 'generator/docx', component: PaperGeneratorComponent },
  { path: 'liturgy', component: LiturgyComponent },
  { path: 'favorite', component: FavoriteComponent },
  { path: '', component: MainPageComponent, pathMatch: 'full' },
  { path: '404', component: PageNotFoundComponent },
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
  imports: [RouterModule.forRoot(appRoutes, { scrollPositionRestoration: 'enabled', onSameUrlNavigation: 'reload' })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
