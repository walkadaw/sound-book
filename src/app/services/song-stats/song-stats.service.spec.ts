import { TestBed } from '@angular/core/testing';

import { SongStatsService } from './song-stats.service';

const stored = () => JSON.parse(localStorage.getItem('songStats'));

describe('SongStatsService', () => {
  let service: SongStatsService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    TestBed.configureTestingModule({});
    service = TestBed.inject(SongStatsService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('accumulates counts without sending right away', () => {
    service.record('view', 5);
    service.record('view', 5);
    service.record('show', 7);

    expect(stored()).toEqual({ view: { 5: 2 }, show: { 7: 1 } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the batch and clears it once the server accepts it', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    service.record('view', 5);

    await vi.runAllTimersAsync();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ view: { 5: 1 }, show: {} });
    expect(stored()).toEqual({ view: {}, show: {} });
  });

  it('keeps the counts when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    service.record('show', 3);

    await vi.runAllTimersAsync();

    expect(stored()).toEqual({ view: {}, show: { 3: 1 } });
  });

  it('keeps the counts when the server rejects them', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    service.record('show', 3);

    await vi.runAllTimersAsync();

    expect(stored()).toEqual({ view: {}, show: { 3: 1 } });
  });

  it('does not resend a batch in flight when the page is hidden', async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { onLine: true, sendBeacon });
    service.record('view', 5);

    await vi.advanceTimersByTimeAsync(30_000);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(sendBeacon).not.toHaveBeenCalled();
    expect(stored()).toEqual({ view: {}, show: {} });
  });

  it('keeps counts recorded while the request is in flight', async () => {
    let respond: (value: { ok: boolean }) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise((resolve) => (respond = resolve)));
    service.record('view', 5);

    await vi.advanceTimersByTimeAsync(30_000);
    service.record('view', 5);
    respond({ ok: true });
    await vi.advanceTimersByTimeAsync(0);

    expect(stored()).toEqual({ view: { 5: 1 }, show: {} });
  });
});
