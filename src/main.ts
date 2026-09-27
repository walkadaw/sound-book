import { provideZonelessChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { provideHttpClient, withXhr } from '@angular/common/http';
import { TitleStrategy, provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from './environments/environment';
import { StartUpService } from './app/services/start-up-service/start-up.service';
import { PwaUpdateService } from './app/services/pwa-update/pwa-update.service';
import { ThemeService } from './app/services/theme/theme.service';
import { appRoutes } from './app/app.routing';
import { searchReducer } from './app/redux/reducers/search.reducer';
import { settingsReducer } from './app/redux/reducers/settings.reducer';
import { favoriteReducer } from './app/redux/reducers/favorite.reducer';
import { FavoriteEffects } from './app/redux/effects/favorite.effect';
import { WakeLockService } from './app/services/wakelock/wake-lock.service';
import { AppComponent } from './app/application/app.component';
import { PageTitleStrategy } from './app/services/page-title/page-title.strategy';

bootstrapApplication(AppComponent, {
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
    provideAppInitializer(() => {
      inject(PwaUpdateService).init();
      inject(ThemeService);

      return inject(StartUpService).load();
    }),
    provideHttpClient(withXhr()),
    provideZonelessChangeDetection(),
    provideRouter(
      appRoutes,
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ],
}).catch((err) => console.error(err));
