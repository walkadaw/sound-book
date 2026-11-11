import { Signal, computed, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { MessageAction, Room } from 'trystero';
import { HostProof, newNonce } from './host-key';
import { ConnectionStatus, RemoteCommand, RemoteState, RemoteUpdate, applyUpdate, withoutProgram } from './remote-control';

/** The presentation's end of one way to reach remotes. */
export interface HostTransport {
  readonly commands$: Observable<RemoteCommand>;
  readonly remotes: Signal<number>;
  /** Sends the state to every remote; a remote that connects later gets the last one. */
  broadcast(state: RemoteState): void;
  close(): void;
}

/** A remote's end. */
export interface ClientTransport {
  readonly state$: Observable<RemoteState>;
  readonly status: Signal<ConnectionStatus>;
  send(command: RemoteCommand): void;
  close(): void;
  /** Starts trying again after the remote gave up. */
  reconnect?(): void;
}

const COMMAND = 'cmd';
const STATE = 'state';
const BUSY = 'busy';
const HELLO = 'hello';
const CLOSED = 'closed';
const CHALLENGE = 'challenge';
const PROOF = 'proof';
const CHALLENGE_EVERY_MS = 1_000;
const APP_ID = 'sound-book-remote';

type ChannelMessage =
  | { type: 'host' }
  | { type: 'closed' }
  | { type: 'state'; state: RemoteUpdate }
  | { type: 'hello'; from: string }
  | { type: 'bye'; from: string }
  | { type: 'command'; from: string; command: RemoteCommand };

export function channelName(presentationId: string): string {
  return `remote-control-${presentationId}`;
}

/**
 * The last state the presentation sent, to give a remote that connects later. Its time is moved on to now,
 * or the timer of that remote would start from when the slide last changed.
 */
class LastState {
  private state?: RemoteState;
  private sentAt = 0;

  /** What goes to the remotes that have the program already. */
  update(state: RemoteState): RemoteUpdate {
    const programChanged = state.songs !== this.state?.songs || state.masses !== this.state?.masses;

    this.state = state;
    this.sentAt = Date.now();

    return programChanged ? state : withoutProgram(state);
  }

  /** The whole state, as of now. */
  get(): RemoteState | undefined {
    return this.state && { ...this.state, elapsed: this.state.elapsed + Date.now() - this.sentAt };
  }
}

/** Remotes in other windows of the same browser. */
export class ChannelHostTransport implements HostTransport {
  private channel: BroadcastChannel;
  private commands = new Subject<RemoteCommand>();
  private clients = new Set<string>();
  private count = signal(0);
  private last = new LastState();

  readonly commands$ = this.commands.asObservable();
  readonly remotes = this.count.asReadonly();

  // Closing the tab destroys no component, so the windows learn it from the page itself.
  private onPageHide = () => this.post({ type: 'closed' });
  private onPageShow = ({ persisted }: PageTransitionEvent) => persisted && this.post({ type: 'host' });

  constructor(name: string) {
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = ({ data }: MessageEvent<ChannelMessage>) => this.receive(data);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onPageShow);
    // control windows left open from before a reload of the presentation say hello again
    this.post({ type: 'host' });
  }

  broadcast(state: RemoteState) {
    this.post({ type: 'state', state: this.last.update(state) });
  }

  close() {
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
    this.post({ type: 'closed' });
    this.channel.close();
    this.commands.complete();
  }

  private receive(message: ChannelMessage) {
    switch (message.type) {
      case 'hello': {
        const state = this.last.get();

        this.clients.add(message.from);
        this.count.set(this.clients.size);

        if (state) {
          this.post({ type: 'state', state });
        }
        break;
      }
      case 'bye':
        this.clients.delete(message.from);
        this.count.set(this.clients.size);
        break;
      case 'command':
        this.commands.next(message.command);
        break;
    }
  }

  private post(message: ChannelMessage) {
    this.channel.postMessage(message);
  }
}

// A presentation in the same browser answers at once; silence means there is none.
const NO_PRESENTATION_AFTER_MS = 3_000;

export class ChannelClientTransport implements ClientTransport {
  private channel: BroadcastChannel;
  private id = crypto.getRandomValues(new Uint32Array(2)).join('-');
  private states = new Subject<RemoteState>();
  private connection = signal<ConnectionStatus>('connecting');
  private current: RemoteState | null = null;
  private silence: ReturnType<typeof setTimeout>;

  readonly state$ = this.states.asObservable();
  readonly status = this.connection.asReadonly();

  private onPageHide = () => this.post({ type: 'bye', from: this.id });
  private onPageShow = ({ persisted }: PageTransitionEvent) => persisted && this.post({ type: 'hello', from: this.id });

  constructor(name: string) {
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = ({ data }: MessageEvent<ChannelMessage>) => this.receive(data);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onPageShow);
    this.post({ type: 'hello', from: this.id });
    this.silence = setTimeout(() => {
      if (this.connection() === 'connecting') {
        this.connection.set('lost');
      }
    }, NO_PRESENTATION_AFTER_MS);
  }

  send(command: RemoteCommand) {
    this.post({ type: 'command', from: this.id, command });
  }

  close() {
    clearTimeout(this.silence);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
    this.post({ type: 'bye', from: this.id });
    this.channel.close();
    this.states.complete();
  }

  private receive(message: ChannelMessage) {
    switch (message.type) {
      case 'host':
        this.post({ type: 'hello', from: this.id });
        break;
      case 'state':
        this.current = applyUpdate(this.current, message.state);

        if (this.current) {
          this.connection.set('connected');
          this.states.next(this.current);
        }
        break;
      case 'closed':
        this.connection.set('lost');
        break;
    }
  }

  private post(message: ChannelMessage) {
    this.channel.postMessage(message);
  }
}

/**
 * One remote on another device, over WebRTC. Anyone who sees the QR code on a projected screen can join the room,
 * so the room belongs to the first device that introduces itself: only that device controls the presentation,
 * and only it may come back after its connection dropped. The others are told it is taken and see nothing of it.
 * A device introduces itself only once the presentation has proved who it is, so no other peer learns its token.
 */
export class TrysteroHostTransport implements HostTransport {
  private commands = new Subject<RemoteCommand>();
  // the token of the device the room belongs to; another device needs a new room
  private ownerToken: string | null = null;
  private controller = signal<string | null>(null);
  private ownedState = signal(false);
  private stateAction: MessageAction<RemoteUpdate>;
  private busyAction: MessageAction<null>;
  private closedAction: MessageAction<null>;
  private last = new LastState();

  readonly commands$ = this.commands.asObservable();
  readonly remotes = computed(() => (this.controller() ? 1 : 0));
  /** Set once a device has taken the room, even while that device is away. */
  readonly owned = this.ownedState.asReadonly();

  constructor(
    private room: Room,
    prove: (nonce: string, peerId: string) => Promise<HostProof>,
  ) {
    this.stateAction = room.makeAction<RemoteUpdate>(STATE);
    this.busyAction = room.makeAction<null>(BUSY);
    this.closedAction = room.makeAction<null>(CLOSED);

    const proof = room.makeAction<HostProof>(PROOF);
    const answeredAt = new Map<string, number>();

    // Anyone who saw the code may ask; signing on every message would let one peer keep the laptop busy.
    room.makeAction<string>(CHALLENGE).onMessage = async (nonce, { peerId }) => {
      if (Date.now() - (answeredAt.get(peerId) ?? 0) < CHALLENGE_EVERY_MS) {
        return;
      }

      answeredAt.set(peerId, Date.now());
      proof.send(await prove(nonce, peerId), { target: peerId });
    };
    room.makeAction<string>(HELLO).onMessage = (token, { peerId }) => this.hello(token, peerId);
    room.makeAction<RemoteCommand>(COMMAND).onMessage = (command, { peerId }) => {
      if (peerId === this.controller()) {
        this.commands.next(command);
      }
    };
    room.onPeerLeave = (peerId) => {
      answeredAt.delete(peerId);

      if (peerId === this.controller()) {
        this.controller.set(null);
      }
    };
  }

  broadcast(state: RemoteState) {
    const controller = this.controller();
    const update = this.last.update(state);

    if (controller) {
      this.stateAction.send(update, { target: controller });
    }
  }

  /** Tells the device it was disconnected on purpose, so it stops trying to come back. */
  close() {
    const controller = this.controller();
    const told = controller ? this.closedAction.send(null, { target: controller }) : Promise.resolve();

    // a device that is gone cannot answer, so the room is left after a moment anyway
    Promise.race([told, new Promise((resolve) => setTimeout(resolve, 1000))]).finally(() => this.room.leave());
    this.commands.complete();
  }

  private hello(token: string, peerId: string) {
    if (this.ownerToken === null) {
      this.ownerToken = token;
      this.ownedState.set(true);
    }

    if (token !== this.ownerToken) {
      this.busyAction.send(null, { target: peerId });
      return;
    }

    // the owner, maybe back with a new peer id after its page was reloaded
    this.controller.set(peerId);

    const state = this.last.get();

    if (state) {
      this.stateAction.send(state, { target: peerId });
    }
  }
}

/** Switches off the relays' reconnection while the page sleeps, and lets them reconnect at once on waking. */
export interface RelayControl {
  pause(): void;
  resume(): void;
}

// Past this the presentation is most likely closed: trying on would only keep the phone and the relays busy.
const GIVE_UP_AFTER_MS = 120_000;
const RETRY_EVERY_MS = 10_000;
const PING_TIMEOUT_MS = 3_000;

/**
 * A phone locked for a minute freezes the page: the connection and the relays' sockets die, and the library would
 * find the presentation again only on its next announcement, up to a minute later. So the remote checks the
 * connection when the page wakes and joins the room again at once when it is gone.
 */
export class TrysteroClientTransport implements ClientTransport {
  private states = new Subject<RemoteState>();
  private connection = signal<ConnectionStatus>('connecting');
  private current: RemoteState | null = null;
  private room?: Room;
  private commandAction?: MessageAction<RemoteCommand>;
  // Other remotes that scanned the same code are peers too: only the peer that proved it is the presentation counts.
  private trusted?: string;
  // the presentation, once it sent the state
  private hostId?: string;
  private droppedAt = Date.now();
  private enteredAt = 0;
  private joining?: Promise<void>;
  private retryTimer: ReturnType<typeof setInterval>;
  // closed here, or disconnected by the presentation: nothing to come back to
  private ended = false;

  readonly state$ = this.states.asObservable();
  readonly status = this.connection.asReadonly();

  constructor(
    private join: () => Promise<Room>,
    private token: string,
    private relays: RelayControl,
    private verify: (nonce: string, proof: HostProof) => Promise<boolean>,
  ) {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.retryTimer = setInterval(() => this.retry(), RETRY_EVERY_MS);
    this.rejoin();
  }

  send(command: RemoteCommand) {
    if (this.hostId) {
      this.commandAction?.send(command, { target: this.hostId });
    }
  }

  reconnect() {
    if (this.ended) {
      return;
    }

    this.droppedAt = Date.now();
    this.connection.set('connecting');
    this.rejoin();
  }

  close() {
    this.stop();
    this.room?.leave();
    this.states.complete();
  }

  // Nothing to come back to. The relays' reconnection is paused for the whole page, so it must not stay that way.
  private stop() {
    this.ended = true;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    clearInterval(this.retryTimer);
    this.relays.resume();
  }

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.relays.pause();
      return;
    }

    this.relays.resume();

    if (this.connection() === 'lost') {
      this.reconnect();
      return;
    }

    // The connection may have dropped long before, while the phone was locked; the time to give up counts from now.
    if (!this.hostId) {
      this.droppedAt = Date.now();
    }

    this.check();
  };

  // The connection from before the page slept may be dead without either side having noticed yet.
  private async check() {
    const { room, hostId } = this;

    if (this.ended || this.connection() === 'busy') {
      return;
    }

    if (!room || !hostId) {
      this.rejoin();
      return;
    }

    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), PING_TIMEOUT_MS));

    try {
      await Promise.race([room.ping(hostId), timeout]);
    } catch {
      if (this.room === room && this.hostId === hostId) {
        this.drop();
        this.rejoin();
      }
    }
  }

  private retry() {
    if (this.ended || this.hostId || this.connection() !== 'connecting' || document.hidden) {
      return;
    }

    // still finding the presentation, or proving it, from the last join
    if (this.joining || Date.now() - this.enteredAt < RETRY_EVERY_MS) {
      return;
    }

    if (Date.now() - this.droppedAt > GIVE_UP_AFTER_MS) {
      this.giveUp();
      return;
    }

    this.rejoin();
  }

  // Out of the room, so that the library stops announcing and a late answer cannot contradict the status.
  private giveUp() {
    this.connection.set('lost');
    this.room?.leave();
    this.room = undefined;
  }

  private drop() {
    this.hostId = undefined;
    this.droppedAt = Date.now();
    this.connection.set('connecting');
  }

  private rejoin() {
    this.joining ??= this.enter().finally(() => (this.joining = undefined));
  }

  private async enter() {
    // the library hands back the same room until the old one is fully left
    await this.room?.leave();
    this.room = undefined;

    const room = await this.join();

    if (this.ended || this.connection() === 'lost') {
      room.leave();
      return;
    }

    this.room = room;
    this.enteredAt = Date.now();
    this.trusted = undefined;
    this.commandAction = room.makeAction<RemoteCommand>(COMMAND);

    const hello = room.makeAction<string>(HELLO);
    const challenge = room.makeAction<string>(CHALLENGE);
    const nonces = new Map<string, string>();
    const fromHost = (peerId: string) => this.room === room && peerId === this.trusted;

    room.makeAction<HostProof>(PROOF).onMessage = async (proof, { peerId }) => {
      const nonce = nonces.get(peerId);

      nonces.delete(peerId);

      if (nonce && (await this.verify(nonce, proof)) && this.room === room) {
        this.trusted = peerId;
        hello.send(this.token, { target: peerId });
      }
    };
    room.makeAction<null>(BUSY).onMessage = (_, { peerId }) => {
      if (fromHost(peerId)) {
        this.connection.set('busy');
      }
    };
    room.makeAction<null>(CLOSED).onMessage = (_, { peerId }) => {
      if (fromHost(peerId)) {
        this.stop();
        this.hostId = undefined;
        this.connection.set('closed');
        room.leave();
      }
    };
    room.makeAction<RemoteUpdate>(STATE).onMessage = (update, { peerId }) => {
      const state = fromHost(peerId) ? applyUpdate(this.current, update) : null;

      if (state) {
        this.current = state;
        this.hostId = peerId;
        this.connection.set('connected');
        this.states.next(state);
      }
    };
    // Every peer is asked to prove it is the presentation; the others cannot answer.
    room.onPeerJoin = (peerId) => {
      const nonce = newNonce();

      nonces.set(peerId, nonce);
      challenge.send(nonce, { target: peerId });
    };
    room.onPeerLeave = (peerId) => {
      nonces.delete(peerId);

      if (peerId === this.trusted) {
        this.trusted = undefined;
      }

      if (peerId === this.hostId) {
        this.drop();
      }
    };
  }
}

export async function joinRemoteRoom(roomId: string): Promise<Room> {
  // Loaded on demand: only a presentation controlled from another device needs WebRTC matchmaking.
  const { joinRoom } = await import('trystero');

  // The room id reaches the remote only through the QR code or the link, so as the password it hides
  // the handshake from the relays.
  return joinRoom({ appId: APP_ID, password: roomId }, roomId);
}

/** This page's peer id, as the other peers see it. */
export async function remoteSelfId(): Promise<string> {
  return (await import('trystero')).selfId;
}

export async function relayControl(): Promise<RelayControl> {
  const { pauseRelayReconnection, resumeRelayReconnection } = await import('trystero');

  return { pause: pauseRelayReconnection, resume: resumeRelayReconnection };
}
