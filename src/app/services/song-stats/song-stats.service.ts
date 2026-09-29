import { DOCUMENT, InjectionToken, PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

const KINDS = ['view', 'show', 'favorite'] as const;

export type SongStatKind = (typeof KINDS)[number];

export type SongStats = Record<SongStatKind, Record<string, number>>;

const STATS_KEY = 'songStats';
const FLUSH_DELAY = 30_000;
const STATS_URL = `${environment.baseUrl}/song/stats`;

/** Off outside production builds: `ng serve` proxies the API to the live server and would skew its numbers. */
export const SONG_STATS_ENABLED = new InjectionToken<boolean>('SONG_STATS_ENABLED', {
  factory: () => environment.production,
});

/**
 * Counts song usage locally and sends the totals to the server in batches, so opening a song never waits on the
 * network. Counts survive offline use and reloads in localStorage and are sent once the device is back online.
 */
@Service()
export class SongStatsService {
  private document = inject(DOCUMENT);
  private enabled = isPlatformBrowser(inject(PLATFORM_ID)) && inject(SONG_STATS_ENABLED);

  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private sending = false;

  constructor() {
    if (!this.enabled) {
      return;
    }

    const window = this.document.defaultView;

    window.addEventListener('online', () => this.scheduleFlush());
    // Last chance to send before the tab is closed or the app is put in the background; a regular request could be
    // cancelled by then, a beacon is not.
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'hidden') {
        this.flushWithBeacon();
      }
    });

    // Counts left from an earlier offline session.
    this.scheduleFlush();
  }

  record(kind: SongStatKind, songId: string | number): void {
    if (!this.enabled) {
      return;
    }

    const stats = this.read();
    const id = songId.toString();

    stats[kind][id] = (stats[kind][id] ?? 0) + 1;
    this.write(stats);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, FLUSH_DELAY);
  }

  private async flush(): Promise<void> {
    if (this.sending) {
      return;
    }

    const stats = this.claim();

    if (!stats) {
      return;
    }

    this.sending = true;

    try {
      const response = await fetch(STATS_URL, {
        method: 'POST',
        body: JSON.stringify(stats),
        keepalive: true,
      });

      if (!response.ok) {
        this.restore(stats);
      }
    } catch {
      // Offline or the server is unreachable: the counts wait for the next 'online' event or app start.
      this.restore(stats);
    } finally {
      this.sending = false;
    }
  }

  private flushWithBeacon(): void {
    if (!('sendBeacon' in navigator)) {
      return;
    }

    const stats = this.claim();

    if (stats && !navigator.sendBeacon(STATS_URL, JSON.stringify(stats))) {
      this.restore(stats);
    }
  }

  /**
   * Takes the stored counts out of localStorage before they are sent. Other tabs and the speaker notes frames share
   * the storage, and a page closed mid-request cannot clean up after itself: counts left in storage would be sent
   * twice. A batch lost with a closed page is rare and cheaper than a doubled one.
   */
  private claim(): SongStats | null {
    const stats = this.read();

    if (!navigator.onLine || KINDS.every((kind) => !Object.keys(stats[kind]).length)) {
      return null;
    }

    this.write(emptyStats());

    return stats;
  }

  private restore(unsent: SongStats): void {
    const stats = this.read();

    for (const kind of KINDS) {
      for (const [id, count] of Object.entries(unsent[kind])) {
        stats[kind][id] = (stats[kind][id] ?? 0) + count;
      }
    }

    this.write(stats);
  }

  private read(): SongStats {
    try {
      const stats = JSON.parse(localStorage.getItem(STATS_KEY)) as Partial<SongStats> | null;

      return { view: stats?.view ?? {}, show: stats?.show ?? {}, favorite: stats?.favorite ?? {} };
    } catch {
      return emptyStats();
    }
  }

  private write(stats: SongStats): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // Statistics are best effort and must never break the app (quota exceeded, private mode).
    }
  }
}

function emptyStats(): SongStats {
  return { view: {}, show: {}, favorite: {} };
}
