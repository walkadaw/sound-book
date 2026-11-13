import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { LiturgyStatus } from '../../interfaces/liturgy';
import { SlideList } from '../../interfaces/slide';
import { RevealService } from '../reveal-service/reveal.service';
import { RemoteCommand, RemoteState } from './remote-control';
import { RemoteHost } from './remote-host.service';
import { ChannelClientTransport, ChannelHostTransport, HostTransport } from './remote-transport';

class FakeTransport implements HostTransport {
  readonly commands = new Subject<RemoteCommand>();
  readonly commands$ = this.commands.asObservable();
  readonly remotes = signal(0);
  readonly sent: RemoteState[] = [];
  closed = false;

  broadcast(state: RemoteState) {
    this.sent.push(state);
  }

  close() {
    this.closed = true;
  }
}

const song = (title: string, startIndex: number, endIndex: number): SlideList => ({
  id: title,
  title,
  slides: Array.from({ length: endIndex - startIndex + 1 }, () => ({ fontSize: 58, text: title })),
  startIndex,
  endIndex,
});

describe('RemoteHost', () => {
  let host: RemoteHost;
  let reveal: {
    slideIndex: ReturnType<typeof signal<number>>;
    paused: ReturnType<typeof signal<boolean>>;
    light: ReturnType<typeof signal<boolean>>;
    next: ReturnType<typeof vi.fn>;
    prev: ReturnType<typeof vi.fn>;
    slide: ReturnType<typeof vi.fn>;
    setLight: (light: boolean) => void;
    setPaused: (paused: boolean) => void;
  };
  const slides = signal<SlideList[]>([]);
  const add = vi.fn();
  const remove = vi.fn();
  const move = vi.fn();
  const massesStatus = signal<LiturgyStatus>('ready');
  const refreshMasses = vi.fn();

  beforeEach(() => {
    reveal = {
      slideIndex: signal(0),
      paused: signal(false),
      light: signal(false),
      next: vi.fn(),
      prev: vi.fn(),
      slide: vi.fn(),
      setLight: (light) => reveal.light.set(light),
      setPaused: (paused) => reveal.paused.set(paused),
    };
    slides.set([song('A', 0, 1), song('B', 2, 2)]);
    add.mockReset();
    remove.mockReset();
    move.mockReset();
    refreshMasses.mockReset();
    massesStatus.set('ready');

    TestBed.configureTestingModule({ providers: [RemoteHost, { provide: RevealService, useValue: reveal }] });
    host = TestBed.inject(RemoteHost);
    const masses = signal([{ id: 'l', title: 'Чацвер' }]);
    host.attach({ slides, masses, massesStatus, add, remove, move, refreshMasses });
  });

  it('should run the commands of remotes on every transport', () => {
    const phone = new FakeTransport();
    const window = new FakeTransport();
    host.connect(phone);
    host.connect(window);

    phone.commands.next({ type: 'next' });
    window.commands.next({ type: 'slide', index: 2, id: 'B' });
    window.commands.next({ type: 'prev' });
    phone.commands.next({ type: 'remove', index: 1, id: 'B' });

    expect(reveal.next).toHaveBeenCalledTimes(1);
    expect(reveal.slide).toHaveBeenCalledWith(2);
    expect(reveal.prev).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(1, 'B');
  });

  it('should leave a slide alone when the program changed under the remote', () => {
    const phone = new FakeTransport();
    host.connect(phone);
    // a song went in at the start while the phone still showed A first
    slides.set([song('C', 0, 0), song('A', 1, 2), song('B', 3, 3)]);

    phone.commands.next({ type: 'slide', index: 0, id: 'A' });
    phone.commands.next({ type: 'slide', index: 1, id: 'A' });

    expect(reveal.slide.mock.calls).toEqual([[1]]);
  });

  it('should keep the program the same object while only the slide changes', () => {
    const phone = new FakeTransport();
    host.connect(phone);
    TestBed.tick();

    reveal.slideIndex.set(1);
    TestBed.tick();
    expect(phone.sent.at(-1)?.songs).toBe(phone.sent.at(-2)?.songs);

    slides.set([song('A', 0, 1)]);
    TestBed.tick();
    expect(phone.sent.at(-1)?.songs).not.toBe(phone.sent.at(-2)?.songs);
  });

  it('should tell when a room cannot be opened and let it be tried again', async () => {
    const generateKey = vi.spyOn(crypto.subtle, 'generateKey').mockRejectedValue(new Error('no crypto'));

    expect(await host.openRoom()).toBeNull();
    expect([host.roomId(), host.roomFailed()]).toEqual([null, true]);

    generateKey.mockRestore();
    vi.spyOn(crypto.subtle, 'generateKey').mockReturnValue(new Promise(() => {}));
    void host.openRoom();
    expect(host.roomFailed()).toBe(false);
    host.closeRoom();
    vi.restoreAllMocks();
  });

  it('should not open a second room while the new one is still opening', async () => {
    let failFirst!: (error: Error) => void;
    vi.spyOn(crypto.subtle, 'generateKey')
      .mockReturnValueOnce(new Promise((_, reject) => (failFirst = reject)))
      .mockReturnValue(new Promise(() => {}));

    void host.openRoom();
    const second = host.newCode();
    failFirst(new Error('cut short'));
    await new Promise((resolve) => setTimeout(resolve));

    expect(host.openRoom()).toBe(second);
    expect(host.roomFailed()).toBe(false);
    host.closeRoom();
    vi.restoreAllMocks();
  });

  it('should keep every remote on the same state', () => {
    const phone = new FakeTransport();
    const window = new FakeTransport();
    host.connect(phone);
    host.connect(window);
    phone.remotes.set(2);
    window.remotes.set(1);

    phone.commands.next({ type: 'theme', light: true });
    window.commands.next({ type: 'blackout', hidden: true });
    reveal.slideIndex.set(2);
    TestBed.tick();

    for (const transport of [phone, window]) {
      const state = transport.sent.at(-1);

      expect(state).toEqual(expect.objectContaining({ slide: 2, light: true, blackout: true, remotes: 3 }));
      expect(state?.songs.map(({ title }) => title)).toEqual(['A', 'B']);
      expect(state?.masses).toEqual([{ id: 'l', title: 'Чацвер' }]);
    }
  });

  it('should tell every remote where the song it asked for went in', () => {
    const phone = new FakeTransport();
    host.connect(phone);
    add.mockReturnValueOnce(2).mockReturnValueOnce(null);

    phone.commands.next({ type: 'add', id: '7', request: 'a' });
    phone.commands.next({ type: 'add', id: '8', request: 'b' });
    TestBed.tick();

    expect(add.mock.calls).toEqual([['7'], ['8']]);
    expect(phone.sent.at(-1)?.added).toEqual([
      { request: 'a', index: 2 },
      { request: 'b', index: null },
    ]);
  });

  it('should ask for the masses again for a remote and tell every remote how it goes', () => {
    const phone = new FakeTransport();
    host.connect(phone);

    phone.commands.next({ type: 'refreshMasses' });
    expect(refreshMasses).toHaveBeenCalledTimes(1);

    massesStatus.set('loading');
    TestBed.tick();
    expect(phone.sent.at(-1)?.massesStatus).toBe('loading');
  });

  it('should pass a move on with the song it names', () => {
    const phone = new FakeTransport();
    host.connect(phone);

    phone.commands.next({ type: 'move', index: 0, id: 'A', to: 2 });

    expect(move.mock.calls).toEqual([[0, 'A', 2]]);
  });

  it('should start the timer again from zero for every remote', () => {
    const phone = new FakeTransport();
    const window = new FakeTransport();
    host.connect(phone);
    host.connect(window);

    // ten minutes into the service
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 600_000);
    reveal.slideIndex.set(1);
    TestBed.tick();
    expect(phone.sent.at(-1)?.elapsed).toBeGreaterThanOrEqual(600_000);

    window.commands.next({ type: 'resetTimer' });
    TestBed.tick();

    expect(phone.sent.at(-1)?.elapsed).toBe(0);
    expect(window.sent.at(-1)?.elapsed).toBe(0);
    now.mockRestore();
  });

  it('should close the transports with the presentation', () => {
    const phone = new FakeTransport();
    host.connect(phone);

    TestBed.resetTestingModule();

    expect(phone.closed).toBe(true);
  });

  it('should serve a control window over the channel next to a device', async () => {
    const name = `remote-control-${Math.random()}`;
    const device = new FakeTransport();
    host.connect(device);
    host.connect(new ChannelHostTransport(name));
    const window = new ChannelClientTransport(name);
    await new Promise((resolve) => setTimeout(resolve, 20));
    TestBed.tick();

    window.send({ type: 'next' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    TestBed.tick();

    expect(reveal.next).toHaveBeenCalledTimes(1);
    expect(host.remotes()).toBe(1);
    expect(device.sent.at(-1)?.remotes).toBe(1);
    window.close();
  });
});
