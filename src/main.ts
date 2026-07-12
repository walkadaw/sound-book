import {
  enableProdMode,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { environment } from './environments/environment';
import { AppComponent } from './app/application/app.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { SongModule } from './app/services/song-service/song.module';
import { LiturgyModule } from './app/services/liturgy-service/liturgy.module';
import { WakeLockService } from './app/services/wakelock/wake-lock.service';
import { FavoriteEffects } from './app/redux/effects/favorite.effect';
import { EffectsModule } from '@ngrx/effects';
import { favoriteReducer } from './app/redux/reducers/favorite.reducer';
import { settingsReducer } from './app/redux/reducers/settings.reducer';
import { searchReducer } from './app/redux/reducers/search.reducer';
import { StoreModule } from '@ngrx/store';
import { appRoutes } from './app/app.routing';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HammerConfig } from './app/services/hammer-config/hammer-config.service';
import { HAMMER_GESTURE_CONFIG, BrowserModule, HammerModule, bootstrapApplication } from '@angular/platform-browser';
import { startUpFactory, StartUpService } from './app/services/start-up-service/start-up.service';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
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
      ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })
    ),
    provideAppInitializer(() => {
      const initializerFn = startUpFactory(inject(StartUpService));
      return initializerFn();
    }),
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: HammerConfig,
    },
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(
      appRoutes,
      withRouterConfig({
        onSameUrlNavigation: 'reload',
      }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
  ],
}).catch((err) => console.error(err));
