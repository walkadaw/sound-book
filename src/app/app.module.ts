import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, HammerModule, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app.routing';
import { AppComponent } from './application/app.component';
import { MainSoundComponent } from './application/main-sound/main-sound.component';
import { AboutComponent } from './components/about/about.component';
import { FavoriteComponent } from './components/favorite/favorite.component';
import { FooterComponent } from './components/footer/footer.component';
import { GadzinkiComponent } from './components/gadzinki/gadzinki.component';
import { HeaderModule } from './components/header/header.module';
import { LiturgyComponent } from './components/liturgy/liturgy.component';
import { MainPageComponent } from './components/main-page/main-page.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { PaperGeneratorComponent } from './components/paper-generator/paper-generator.component';
import { SongDetailsComponent } from './components/song-details/song-details.component';
import { LetDirectiveModule } from './directives/let-directive/app-let.module';
import { MatModule } from './mat.module';
import { ReplaceSpacePipe } from './pipes/replace-space/replace-space.pipe';
import { FavoriteEffects } from './redux/effects/favorite.effect';
import { favoriteReducer } from './redux/reducers/favorite.reducer';
import { searchReducer } from './redux/reducers/search.reducer';
import { settingsReducer } from './redux/reducers/settings.reducer';
import { HammerConfig } from './services/hammer-config/hammer-config.service';
import { LiturgyModule } from './services/liturgy-service/liturgy.module';
import { SongModule } from './services/song-service/song.module';
import { startUpFactory, StartUpService } from './services/start-up-service/start-up.service';
import { WakeLockService } from './services/wakelock/wake-lock.service';
import { PlaylistComponent } from './components/playlist/playlist.component';
import { AddPlaylistComponent } from './components/playlist/add-playlist/add-playlist.component';
import { ViewPlaylistComponent } from './components/playlist/view-playlist/view-playlist.component';
import { PlaylistMenuModule } from './components/playlist/playlist-menu/playlist-menu.module';

@NgModule({
  declarations: [
    AppComponent,
    SongDetailsComponent,
    FooterComponent,
    PageNotFoundComponent,
    MainPageComponent,
    LiturgyComponent,
    ReplaceSpacePipe,
    PaperGeneratorComponent,
    MainSoundComponent,
    FavoriteComponent,
    AboutComponent,
    GadzinkiComponent,
    PlaylistComponent,
    AddPlaylistComponent,
    ViewPlaylistComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    // redux
    StoreModule.forRoot({
      searchInput: searchReducer,
      settings: settingsReducer,
      favorite: favoriteReducer,
    }),
    EffectsModule.forRoot([FavoriteEffects, WakeLockService]),
    LetDirectiveModule,
    MatModule,
    LiturgyModule,
    SongModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    HammerModule,
    HeaderModule,
    PlaylistMenuModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: startUpFactory,
      deps: [StartUpService],
      multi: true,
    },
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: HammerConfig,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
