import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { TitleStrategy, provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routing';
import { searchReducer } from './redux/reducers/search.reducer';
import { settingsReducer } from './redux/reducers/settings.reducer';
import { favoriteReducer } from './redux/reducers/favorite.reducer';
import { FavoriteEffects } from './redux/effects/favorite.effect';
import { WakeLockService } from './services/wakelock/wake-lock.service';
import { PageTitleStrategy } from './services/page-title/page-title.strategy';

// Shared by the browser and the build-time prerender; platform-specific startup lives in main.ts and main.server.ts.
export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({
      searchInput: searchReducer,
      settings: settingsReducer,
      favorite: favoriteReducer,
    }),
    provideEffects(FavoriteEffects, WakeLockService),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
    }),
    provideHttpClient(withXhr()),
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideRouter(
      appRoutes,
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
};
