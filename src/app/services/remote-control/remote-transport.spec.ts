import type { Room } from 'trystero';
import { HostProof } from './host-key';
import { RemoteCommand, RemoteState, RemoteUpdate, withoutProgram } from './remote-control';
import {
  ChannelClientTransport,
  ChannelHostTransport,
  TrysteroClientTransport,
  TrysteroHostTransport,
} from './remote-transport';

const state = (slide: number): RemoteState => ({
  slide,
  songs: [],
  masses: [],
  massesStatus: 'ready',
  light: false,
  blackout: false,
  elapsed: 0,
  remotes: 1,
  added: [],
});

// BroadcastChannel delivers asynchronously
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('ChannelHostTransport and ChannelClientTransport', () => {
  let name: string;

  beforeEach(() => (name = `remote-control-${Math.random()}`));

  it('should count the control windows and give a new one the last state', async () => {
    const host = new ChannelHostTransport(name);
    host.broadcast(state(3));

    const remote = new ChannelClientTransport(name);
    const received: RemoteState[] = [];
    remote.state$.subscribe((value) => received.push(value));
    await settle();

    expect(host.remotes()).toBe(1);
    expect(remote.status()).toBe('connected');
    expect(received.at(-1)?.slide).toBe(3);

    remote.close();
    await settle();
    expect(host.remotes()).toBe(0);
    host.close();
  });

  it('should give a window that opens later the time as of now, and keep its program through updates', async () => {
    const host = new ChannelHostTransport(name);
    const first = { ...state(3), masses: [{ id: 'l', title: 'Чацвер' }] };
    host.broadcast(first);

    // the window opens ten minutes after the slide changed
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 600_000);
    const remote = new ChannelClientTransport(name);
    const received: RemoteState[] = [];
    remote.state$.subscribe((value) => received.push(value));
    await settle();
    expect(received.at(-1)?.elapsed).toBeGreaterThanOrEqual(600_000);

    host.broadcast({ ...first, slide: 4 });
    await settle();
    expect(received.at(-1)).toEqual({ ...first, slide: 4 });
    now.mockRestore();
    [remote, host].forEach((transport) => transport.close());
  });

  it('should give up on a presentation that does not answer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const remote = new ChannelClientTransport(name);

    await vi.advanceTimersByTimeAsync(3_000);

    expect(remote.status()).toBe('lost');
    remote.close();
    vi.useRealTimers();
  });

  it('should pass the commands of every window to the presentation', async () => {
    const host = new ChannelHostTransport(name);
    const commands: RemoteCommand[] = [];
    host.commands$.subscribe((command) => commands.push(command));
    const first = new ChannelClientTransport(name);
    const second = new ChannelClientTransport(name);

    first.send({ type: 'next' });
    second.send({ type: 'slide', index: 2, id: 'A' });
    await settle();

    expect(host.remotes()).toBe(2);
    expect(commands).toEqual([{ type: 'next' }, { type: 'slide', index: 2, id: 'A' }]);
    [first, second, host].forEach((transport) => transport.close());
  });

  it('should tell the windows when the presentation closes and find them again after a reload', async () => {
    const host = new ChannelHostTransport(name);
    const remote = new ChannelClientTransport(name);
    host.broadcast(state(0));
    await settle();

    host.close();
    await settle();
    expect(remote.status()).toBe('lost');

    const reloaded = new ChannelHostTransport(name);
    reloaded.broadcast(state(1));
    await settle();
    expect(reloaded.remotes()).toBe(1);
    expect(remote.status()).toBe('connected');
    [remote, reloaded].forEach((transport) => transport.close());
  });
});

describe('closing the tab', () => {
  it('should tell the windows the presentation is gone and the presentation a window is gone', async () => {
    const name = `remote-control-${Math.random()}`;
    const host = new ChannelHostTransport(name);
    const remote = new ChannelClientTransport(name);
    host.broadcast(state(0));
    await settle();
    expect(host.remotes()).toBe(1);

    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    await settle();

    expect(remote.status()).toBe('lost');
    expect(host.remotes()).toBe(0);
    [remote, host].forEach((transport) => transport.close());
  });
});

describe('TrysteroHostTransport and TrysteroClientTransport', () => {
  interface FakeAction {
    send: ReturnType<typeof vi.fn>;
    onMessage: ((data: unknown, context: { peerId: string }) => void | Promise<void>) | null;
  }

  const fakeRoom = () => {
    const actions = new Map<string, FakeAction>();
    const room = {
      makeAction: (name: string) => {
        const action: FakeAction = { send: vi.fn(() => Promise.resolve()), onMessage: null };
        actions.set(name, action);
        return action;
      },
      leave: vi.fn(() => Promise.resolve()),
      ping: vi.fn(() => Promise.resolve(5)),
      onPeerJoin: null as ((peerId: string) => void) | null,
      onPeerLeave: null as ((peerId: string) => void) | null,
    };

    return { room, actions, asRoom: room as unknown as Room };
  };

  const prove = (nonce: string, peerId: string) => Promise.resolve({ key: 'key', signature: `${nonce}:${peerId}` });

  describe('on the presentation', () => {
    it('should give the room to the first device that introduces itself', () => {
      const { room, actions, asRoom } = fakeRoom();
      const host = new TrysteroHostTransport(asRoom, prove);
      const commands: RemoteCommand[] = [];
      host.commands$.subscribe((command) => commands.push(command));
      host.broadcast(state(2));

      actions.get('hello')?.onMessage?.('phone-token', { peerId: 'phone' });
      actions.get('hello')?.onMessage?.('other-token', { peerId: 'stranger' });

      expect(actions.get('state')?.send).toHaveBeenCalledWith(expect.objectContaining({ slide: 2 }), {
        target: 'phone',
      });
      expect(actions.get('state')?.send).not.toHaveBeenCalledWith(expect.anything(), { target: 'stranger' });
      expect(actions.get('busy')?.send).toHaveBeenCalledWith(null, { target: 'stranger' });
      expect([host.remotes(), host.owned()]).toEqual([1, true]);

      actions.get('cmd')?.onMessage?.({ type: 'next' }, { peerId: 'stranger' });
      actions.get('cmd')?.onMessage?.({ type: 'prev' }, { peerId: 'phone' });
      expect(commands).toEqual([{ type: 'prev' }]);

      room.onPeerLeave?.('stranger');
      expect(host.remotes()).toBe(1);
    });

    it('should answer the challenge of any peer with a proof for that peer', async () => {
      const { actions, asRoom } = fakeRoom();
      new TrysteroHostTransport(asRoom, prove);

      await actions.get('challenge')?.onMessage?.('nonce', { peerId: 'phone' });

      expect(actions.get('proof')?.send).toHaveBeenCalledWith(
        { key: 'key', signature: 'nonce:phone' },
        { target: 'phone' },
      );
    });

    it('should sign at most one challenge a second for a peer', async () => {
      const { actions, asRoom } = fakeRoom();
      new TrysteroHostTransport(asRoom, prove);
      const challenge = actions.get('challenge')!;

      await Promise.all([1, 2, 3].map((n) => challenge.onMessage?.(`nonce-${n}`, { peerId: 'stranger' })));
      await challenge.onMessage?.('nonce', { peerId: 'phone' });

      expect(actions.get('proof')?.send.mock.calls.map(([, { target }]) => target)).toEqual(['stranger', 'phone']);
    });

    it('should take the same device back after it dropped, even with a new peer id, and no other', () => {
      const { room, actions, asRoom } = fakeRoom();
      const host = new TrysteroHostTransport(asRoom, prove);
      actions.get('hello')?.onMessage?.('phone-token', { peerId: 'phone' });

      room.onPeerLeave?.('phone');
      expect([host.remotes(), host.owned()]).toEqual([0, true]);

      actions.get('hello')?.onMessage?.('other-token', { peerId: 'stranger' });
      expect(host.remotes()).toBe(0);

      host.broadcast(state(4));
      actions.get('hello')?.onMessage?.('phone-token', { peerId: 'phone-reloaded' });
      expect(host.remotes()).toBe(1);
      expect(actions.get('state')?.send).toHaveBeenLastCalledWith(expect.objectContaining({ slide: 4 }), {
        target: 'phone-reloaded',
      });
    });

    it('should send the program only when it changed, and all of the state as of now on coming back', () => {
      const { actions, asRoom } = fakeRoom();
      const host = new TrysteroHostTransport(asRoom, prove);
      const send = actions.get('state')!.send;
      const first = state(0);
      actions.get('hello')?.onMessage?.('phone-token', { peerId: 'phone' });

      host.broadcast(first);
      host.broadcast({ ...first, slide: 1, elapsed: 60_000 });
      expect(send.mock.calls.map(([update]) => 'songs' in update)).toEqual([true, false]);

      // the phone comes back ten minutes later, the slide still the same
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 600_000);
      actions.get('hello')?.onMessage?.('phone-token', { peerId: 'phone-reloaded' });
      const [resent] = send.mock.lastCall!;

      expect(resent.songs).toBe(first.songs);
      expect(resent.elapsed).toBeGreaterThanOrEqual(660_000);
      vi.restoreAllMocks();
    });

    it('should tell the device it was disconnected before leaving the room', async () => {
      const { room, actions, asRoom } = fakeRoom();
      const host = new TrysteroHostTransport(asRoom, prove);
      actions.get('hello')?.onMessage?.('phone-token', { peerId: 'phone' });

      host.close();
      await vi.waitFor(() => expect(room.leave).toHaveBeenCalled());

      expect(actions.get('closed')?.send).toHaveBeenCalledWith(null, { target: 'phone' });
    });
  });

  describe('on the remote', () => {
    let rooms: ReturnType<typeof fakeRoom>[];
    let relays: { pause: ReturnType<typeof vi.fn<() => void>>; resume: ReturnType<typeof vi.fn<() => void>> };
    let remote: TrysteroClientTransport;
    let received: RemoteState[];
    let hidden = false;

    // Only the presentation can sign, and it signs the challenge together with the id of the peer that asked it.
    const verify = (nonce: string, proof: HostProof) => Promise.resolve(proof.signature === `${nonce}:phone`);
    const join = () => {
      const fake = fakeRoom();
      rooms.push(fake);
      return Promise.resolve(fake.asRoom);
    };
    const current = () => rooms[rooms.length - 1];
    const answerChallenge = async (peerId: string, askedBy = 'phone') => {
      const { room, actions } = current();

      room.onPeerJoin?.(peerId);
      const [nonce] = actions.get('challenge')!.send.mock.lastCall as [string, { target: string }];
      await actions.get('proof')?.onMessage?.({ key: 'key', signature: `${nonce}:${askedBy}` }, { peerId });
    };
    const connect = async (update: RemoteUpdate = state(0)) => {
      await vi.waitFor(() => expect(current()?.room.onPeerJoin).toBeTypeOf('function'));
      await answerChallenge('laptop');
      current().actions.get('state')?.onMessage?.(update, { peerId: 'laptop' });
    };
    const create = () => {
      remote = new TrysteroClientTransport(join, 'phone-token', relays, verify);
      received = [];
      remote.state$.subscribe((value) => received.push(value));
    };
    const setHidden = (value: boolean) => {
      hidden = value;
      document.dispatchEvent(new Event('visibilitychange'));
    };

    beforeEach(() => {
      rooms = [];
      relays = { pause: vi.fn<() => void>(), resume: vi.fn<() => void>() };
      hidden = false;
      vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
      create();
    });

    afterEach(() => {
      remote.close();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('should introduce itself only to the presentation and send it the commands', async () => {
      await connect();

      expect(current().actions.get('hello')?.send).toHaveBeenCalledWith('phone-token', { target: 'laptop' });
      expect(remote.status()).toBe('connected');

      remote.send({ type: 'next' });
      expect(current().actions.get('cmd')?.send).toHaveBeenCalledWith({ type: 'next' }, { target: 'laptop' });

      current().room.onPeerLeave?.('other-phone');
      expect(remote.status()).toBe('connected');
    });

    it('should keep its token from a peer that cannot prove it is the presentation, and not listen to it', async () => {
      await vi.waitFor(() => expect(current()?.room.onPeerJoin).toBeTypeOf('function'));
      const { actions } = current();

      // a stranger passing this device's challenge on to the presentation as its own, and a proof nobody asked for
      await answerChallenge('stranger', 'stranger');
      await actions.get('proof')?.onMessage?.({ key: 'key', signature: 'unasked:phone' }, { peerId: 'thief' });
      expect(actions.get('hello')?.send).not.toHaveBeenCalled();

      actions.get('state')?.onMessage?.(state(9), { peerId: 'stranger' });
      expect(remote.status()).toBe('connecting');

      await connect();
      actions.get('state')?.onMessage?.(state(9), { peerId: 'stranger' });
      actions.get('busy')?.onMessage?.(null, { peerId: 'stranger' });
      actions.get('closed')?.onMessage?.(null, { peerId: 'stranger' });

      expect(actions.get('hello')?.send.mock.calls).toEqual([['phone-token', { target: 'laptop' }]]);
      expect(remote.status()).toBe('connected');
      expect(received.at(-1)?.slide).toBe(0);
    });

    it('should keep the program from before when an update leaves it out', async () => {
      const first = { ...state(0), masses: [{ id: 'l', title: 'Чацвер' }] };
      await connect(first);

      current().actions.get('state')?.onMessage?.(withoutProgram({ ...first, slide: 1 }), { peerId: 'laptop' });

      expect(received.at(-1)).toEqual({ ...first, slide: 1 });
    });

    it('should tell a device that came second that the presentation is taken', async () => {
      await connect();

      current().actions.get('busy')?.onMessage?.(null, { peerId: 'laptop' });

      expect(remote.status()).toBe('busy');
    });

    it('should hold the relays while the phone is locked and join again at once on waking', async () => {
      await connect();

      setHidden(true);
      expect(relays.pause).toHaveBeenCalled();
      current().room.onPeerLeave?.('laptop');
      expect(remote.status()).toBe('connecting');

      setHidden(false);
      expect(relays.resume).toHaveBeenCalled();
      await vi.waitFor(() => expect(rooms.length).toBe(2));
      expect(rooms[0].room.leave).toHaveBeenCalled();

      await connect();
      expect(remote.status()).toBe('connected');
    });

    it('should join again when the connection from before the lock does not answer', async () => {
      await connect();
      current().room.ping.mockRejectedValue(new Error('peer disconnected'));

      setHidden(false);

      await vi.waitFor(() => expect(rooms.length).toBe(2));
      expect(remote.status()).toBe('connecting');
    });

    it('should keep a connection that still answers after the lock', async () => {
      await connect();

      setHidden(false);
      await new Promise((resolve) => setTimeout(resolve));

      expect(rooms.length).toBe(1);
      expect(remote.status()).toBe('connected');
    });

    it('should stop coming back once the presentation disconnected it, with the relays running', async () => {
      await connect();
      setHidden(true);

      current().actions.get('closed')?.onMessage?.(null, { peerId: 'laptop' });
      expect(relays.resume).toHaveBeenCalled();
      relays.pause.mockClear();
      setHidden(true);
      setHidden(false);
      remote.reconnect();
      await new Promise((resolve) => setTimeout(resolve));

      expect(remote.status()).toBe('closed');
      expect(relays.pause).not.toHaveBeenCalled();
      expect(rooms.length).toBe(1);
      expect(current().room.leave).toHaveBeenCalled();
    });

    it('should give a connection that dropped during a long lock two minutes from waking', async () => {
      // the room of the remote from before is joined first, so that it is not taken for the new one
      await vi.waitFor(() => expect(rooms[0]?.room.onPeerJoin).toBeTypeOf('function'));
      remote.close();
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
      create();
      await vi.waitFor(() => expect(rooms.length).toBe(2));
      await connect();

      setHidden(true);
      current().room.onPeerLeave?.('laptop');
      await vi.advanceTimersByTimeAsync(20 * 60_000);
      expect(remote.status()).toBe('connecting');

      setHidden(false);
      await vi.advanceTimersByTimeAsync(110_000);
      expect(remote.status()).toBe('connecting');

      await connect();
      expect(remote.status()).toBe('connected');
    });

    it('should give a slow join its full time to find and prove the presentation', async () => {
      await vi.waitFor(() => expect(rooms[0]?.room.onPeerJoin).toBeTypeOf('function'));
      remote.close();
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
      let joined!: () => void;
      const slowJoin = () => {
        const fake = fakeRoom();
        rooms.push(fake);
        return new Promise<Room>((resolve) => (joined = () => resolve(fake.asRoom)));
      };
      remote = new TrysteroClientTransport(slowJoin, 'phone-token', relays, verify);

      await vi.advanceTimersByTimeAsync(8_000);
      joined();
      await vi.advanceTimersByTimeAsync(9_000);
      expect([rooms.length, rooms[1].room.leave.mock.calls.length]).toEqual([2, 0]);

      await vi.advanceTimersByTimeAsync(4_000);
      expect(rooms.length).toBe(3);
    });

    it('should give up after two minutes without the presentation and try again when the phone wakes', async () => {
      // the room of the remote from before is joined first, so that it is not taken for the new one
      await vi.waitFor(() => expect(rooms[0]?.room.onPeerJoin).toBeTypeOf('function'));
      remote.close();
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
      create();
      await vi.waitFor(() => expect(rooms.length).toBe(2));
      await vi.advanceTimersByTimeAsync(110_000);
      expect(remote.status()).toBe('connecting');

      await vi.advanceTimersByTimeAsync(20_000);
      const left = rooms.length;
      expect(remote.status()).toBe('lost');
      expect(current().room.leave).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(60_000);
      expect(rooms.length).toBe(left);

      setHidden(true);
      setHidden(false);
      expect(remote.status()).toBe('connecting');
      await vi.waitFor(() => expect(rooms.length).toBe(left + 1));
      await connect();
      expect(remote.status()).toBe('connected');
    });
  });
});
