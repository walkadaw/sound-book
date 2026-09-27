import { DOCUMENT, InjectionToken, inject } from '@angular/core';

// Base for absolute URLs (canonical, og:url).
// The prerender overrides it with SITE_URL, since there is no real location there.
export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  factory: () => inject(DOCUMENT).location.origin,
});
