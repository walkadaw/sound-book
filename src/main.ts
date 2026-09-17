import {
  enableProdMode,
  provideZoneChangeDetection,
  provideAppInitializer,
  inject,
  importProvidersFrom,
} from '@angular/core';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';

import { provideHttpClient, withXhr, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from './environments/environment';
import { startUpFactory, StartUpService } from './app/services/start-up-service/start-up.service';
import { appRoutes } from './app/app.routing';
import { searchReducer } from './app/redux/reducers/search.reducer';
import { settingsReducer } from './app/redux/reducers/settings.reducer';
import { favoriteReducer } from './app/redux/reducers/favorite.reducer';
import { FavoriteEffects } from './app/redux/effects/favorite.effect';
import { WakeLockService } from './app/services/wakelock/wake-lock.service';
import { LiturgyModule } from './app/services/liturgy-service/liturgy.module';
import { SongModule } from './app/services/song-service/song.module';
import { AppComponent } from './app/application/app.component';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      BrowserModule,
      ReactiveFormsModule,
      // redux
      StoreModule.forRoot({
        searchInput: searchReducer,
        settings: settingsReducer,
        favorite: favoriteReducer,
      }),
      EffectsModule.forRoot([FavoriteEffects, WakeLockService]),
      LiturgyModule,
      SongModule,
      ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    ),
    provideAppInitializer(() => {
      const initializerFn = startUpFactory(inject(StartUpService));
      return initializerFn();
    }),
    provideHttpClient(withXhr(), withInterceptorsFromDi()),
    provideZoneChangeDetection(),
    provideRouter(
      appRoutes,
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
  ],
}).catch((err) => console.error(err));
