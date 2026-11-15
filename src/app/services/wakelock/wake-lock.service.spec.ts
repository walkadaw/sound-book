import { Component, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { WAKE_LOCK_IDLE_TIMEOUT, WakeLockService } from './wake-lock.service';

@Component({ template: '' })
class PageComponent {}

describe('WakeLockService', () => {
  let router: Router;
  let document: Document;
  let visibility: DocumentVisibilityState;
  let request: ReturnType<typeof vi.fn>;
  let release: ReturnType<typeof vi.fn>;

  async function flush(ms = 0): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
  }

  async function navigate(url: string): Promise<void> {
    await router.navigateByUrl(url);
    await flush();
  }

  function setVisibility(state: DocumentVisibilityState): void {
    visibility = state;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    release = vi.fn(() => Promise.resolve());
    request = vi.fn(() => Promise.resolve({ release }));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'song', component: PageComponent, data: { wakeLock: true } },
          { path: 'other', component: PageComponent },
        ]),
      ],
    });
    document = TestBed.inject(DOCUMENT);
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    router = TestBed.inject(Router);
    TestBed.inject(WakeLockService);
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock');
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('holds the lock only on routes that want it', async () => {
    await navigate('/other');
    expect(request).not.toHaveBeenCalled();

    await navigate('/song');
    expect(request).toHaveBeenCalledTimes(1);

    await navigate('/other');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases the lock after the idle timeout', async () => {
    await navigate('/song');

    await flush(WAKE_LOCK_IDLE_TIMEOUT - 1);
    expect(release).not.toHaveBeenCalled();

    await flush(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it.each(['pointerdown', 'keydown', 'wheel'])('restarts the idle timeout on %s', async (type) => {
    await navigate('/song');

    await flush(WAKE_LOCK_IDLE_TIMEOUT - 1);
    document.dispatchEvent(new Event(type));
    await flush(WAKE_LOCK_IDLE_TIMEOUT - 1);

    expect(release).not.toHaveBeenCalled();
  });

  it('re-acquires the lock on activity after the idle timeout', async () => {
    await navigate('/song');
    await flush(WAKE_LOCK_IDLE_TIMEOUT);

    document.dispatchEvent(new Event('pointerdown'));
    await flush();

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('sends a single request for a burst of activity', async () => {
    await navigate('/song');
    for (let i = 0; i < 10; i++) {
      document.dispatchEvent(new Event('wheel'));
    }
    await flush();

    expect(request).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
  });

  it('releases a lock granted after the page stopped wanting it', async () => {
    let grant: (sentinel: unknown) => void = () => {};
    request.mockReturnValueOnce(new Promise((resolve) => (grant = resolve)));

    await navigate('/song');
    await navigate('/other');
    grant({ release });
    await flush();

    expect(release).toHaveBeenCalledTimes(1);
  });

  it('re-acquires the lock when the page becomes visible again', async () => {
    await navigate('/song');

    setVisibility('hidden');
    await flush();
    setVisibility('visible');
    await flush();

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('counts returning to the page as activity', async () => {
    await navigate('/song');
    await flush(WAKE_LOCK_IDLE_TIMEOUT - 1);

    setVisibility('hidden');
    setVisibility('visible');
    await flush(WAKE_LOCK_IDLE_TIMEOUT - 1);

    expect(request).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
