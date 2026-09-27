import { inject, mergeApplicationConfig, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { StartUpService } from './app/services/start-up-service/start-up.service';
import { PwaUpdateService } from './app/services/pwa-update/pwa-update.service';
import { ThemeService } from './app/services/theme/theme.service';
import { SongStatsService } from './app/services/song-stats/song-stats.service';
import { AppComponent } from './app/application/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(
  AppComponent,
  mergeApplicationConfig(appConfig, {
    providers: [
      provideAppInitializer(() => {
        inject(PwaUpdateService).init();
        inject(ThemeService);
        inject(SongStatsService);

        return inject(StartUpService).load();
      }),
    ],
  }),
).catch((err) => console.error(err));
