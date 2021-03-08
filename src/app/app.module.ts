import { BrowserModule, HammerGestureConfig, HammerModule, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { AppComponent } from './application/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SearchSongComponent } from './components/search-song/search-song.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app.routing';
import { ReplaceSpacePipe } from './pipes/replace-space/replace-space.pipe';
import { startUpFactory, StartUpService } from './services/start-up-service/start-up.service';
import { StoreModule } from '@ngrx/store';
import { searchReducer } from './redux/reducers/search.reducer';
import { PaperGeneratorComponent } from './components/paper-generator/paper-generator.component';
import { MainSoundComponent } from './application/main-sound/main-sound.component';
import { LiturgyModule } from './services/liturgy-service/liturgy.module';
import { SongModule } from './services/song-service/song.module';
import { MatModule } from './mat.module';
import { LetDirectiveModule } from './directives/let-directive/app-let.module';
import { settingsReducer } from './redux/reducers/settings.reducer';
import { FavoriteComponent } from './components/favorite/favorite.component';
import { favoriteReducer } from './redux/reducers/favorite.reducer';
import { FavoriteEffects } from './redux/effects/favorite.effect';
import { EffectsModule } from '@ngrx/effects';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { MainPageComponent } from './components/main-page/main-page.component';
import { AboutComponent } from './components/about/about.component';
import { GadzinkiComponent } from './components/gadzinki/gadzinki.component';
import { LiturgyComponent } from './components/liturgy/liturgy.component';
import { SongDetailsComponent } from './components/song-details/song-details.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SongDetailsComponent,
    FooterComponent,
    SearchSongComponent,
    PageNotFoundComponent,
    MainPageComponent,
    LiturgyComponent,
    ReplaceSpacePipe,
    PaperGeneratorComponent,
    MainSoundComponent,
    FavoriteComponent,
    AboutComponent,
    GadzinkiComponent,
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
    EffectsModule.forRoot([FavoriteEffects]),
    LetDirectiveModule,
    MatModule,
    LiturgyModule,
    SongModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    HammerModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: startUpFactory,
      deps: [StartUpService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
