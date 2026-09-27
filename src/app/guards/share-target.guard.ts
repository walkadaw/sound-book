import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { setSearchTermAction } from '../redux/actions/search.actions';
import { SITE_ORIGIN } from '../services/page-meta/site-origin.token';

// Entry point of the manifest share_target: a link to a song or playlist of this app opens it,
// any other shared text becomes a song search.
export const shareTargetGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const { title = '', text = '', url = '' } = route.queryParams;
  const appPath = findAppPath(`${url} ${text}`, inject(SITE_ORIGIN));

  if (appPath) {
    return router.parseUrl(appPath);
  }

  // Android puts the shared selection into text; title is the fallback for apps that send only a subject.
  const searchTerm = (text || title).trim();

  if (searchTerm) {
    inject(Store).dispatch(setSearchTermAction(searchTerm));
  }

  return router.parseUrl('/');
};

// Share sheets often wrap the link in extra text ("Look at this: https://..."), so every URL in it is checked.
function findAppPath(sharedText: string, origin: string): string | null {
  for (const [candidate] of sharedText.matchAll(/https?:\/\/\S+/g)) {
    try {
      const url = new URL(candidate);

      if (url.origin === origin) {
        return url.pathname + url.search + url.hash;
      }
    } catch {
      // Not a parseable URL; keep looking.
    }
  }

  return null;
}
