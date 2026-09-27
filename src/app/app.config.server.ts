import { ApplicationConfig, inject, mergeApplicationConfig, provideAppInitializer } from '@angular/core';
import { PlatformLocation } from '@angular/common';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { Store } from '@ngrx/store';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { loadServerSongList, siteUrl } from './server/server-song-list';
import { svgMatIcons } from './services/mat-icon-registry-service/mat-icon-registry.service';
import { SITE_ORIGIN } from './services/page-meta/site-origin.token';
import { SongService } from './services/song-service/song.service';
import { changeShowMenuAction } from './redux/actions/settings.actions';

const serverOnlyConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: SITE_ORIGIN, useFactory: siteUrl },
    // Replaces the browser startup, which reads localStorage and settles for the cached list.
    provideAppInitializer(() => {
      const songService = inject(SongService);

      registerPlaceholderIcons();
      // Same rule as the browser startup: the menu covers the page everywhere except the home page.
      inject(Store).dispatch(changeShowMenuAction(inject(PlatformLocation).pathname === '/'));

      return loadServerSongList().then((songList) => songService.setSong(songList));
    }),
  ],
};

// Fetching the real SVGs over HTTP stalls the prerender, and the browser renders the page again anyway;
// empty icons just keep mat-icon from failing on unknown names.
function registerPlaceholderIcons(): void {
  const iconRegistry = inject(MatIconRegistry);
  const emptySvg = inject(DomSanitizer).bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

  Object.keys(svgMatIcons).forEach((name) => iconRegistry.addSvgIconLiteral(name, emptySvg));
}

export const serverConfig = mergeApplicationConfig(appConfig, serverOnlyConfig);
