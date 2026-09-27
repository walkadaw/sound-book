import { DOCUMENT, PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export type SongStatKind = 'view' | 'show';

export type SongStats = Record<SongStatKind, Record<string, number>>;

const STATS_KEY = 'songStats';
const FLUSH_DELAY = 30_000;
const STATS_URL = `${environment.baseUrl}/song/stats`;

/**
 * Counts song usage locally and sends the totals to the server in batches, so opening a song never waits on the
 * network. Counts survive offline use and reloads in localStorage and are sent once the device is back online.
 */
@Service()
export class SongStatsService {
  private document = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private sending = false;

  constructor() {
    if (!this.isBrowser) {
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
    if (!this.isBrowser) {
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

    if (!navigator.onLine || (!Object.keys(stats.view).length && !Object.keys(stats.show).length)) {
      return null;
    }

    this.write({ view: {}, show: {} });

    return stats;
  }

  private restore(unsent: SongStats): void {
    const stats = this.read();

    for (const kind of ['view', 'show'] as const) {
      for (const [id, count] of Object.entries(unsent[kind])) {
        stats[kind][id] = (stats[kind][id] ?? 0) + count;
      }
    }

    this.write(stats);
  }

  private read(): SongStats {
    try {
      const stats = JSON.parse(localStorage.getItem(STATS_KEY)) as Partial<SongStats> | null;

      return { view: stats?.view ?? {}, show: stats?.show ?? {} };
    } catch {
      return { view: {}, show: {} };
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
