import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  ConnectionStatus,
  RemoteCommand,
  RemoteMass,
  RemoteSlide,
  RemoteSong,
  RemoteState,
} from '../../services/remote-control/remote-control';
import {
  ChannelClientTransport,
  ClientTransport,
  TrysteroClientTransport,
  channelName,
  joinRemoteRoom,
  RelayControl,
  relayControl,
  remoteSelfId,
} from '../../services/remote-control/remote-transport';
import { verifyHostProof } from '../../services/remote-control/host-key';
import { LiturgyStatus } from '../../interfaces/liturgy';
import { ProgramControl } from '../program-panel/program-control';

// How long the presentation may take to answer an addition before the remote gives up on it.
const ADD_TIMEOUT = 10000;

export interface FlatSlide extends RemoteSlide {
  songIndex: number;
  // the number of the slide within its song, from 0
  inSong: number;
}

/** One remote's view of the presentation, shared by the parts of the remote screen. */
@Injectable()
export class RemoteSession implements ProgramControl {
  private transport = signal<ClientTransport | null>(null);
  private destroyed = false;
  // additions waiting for the presentation to tell where the song went, by request
  private pendingAdds = new Map<string, (index: number | null) => void>();

  readonly state = signal<RemoteState | null>(null);
  // the remote could not even start, without the internet say
  private failed = signal(false);
  private roomId?: string;

  readonly status = computed<ConnectionStatus>(
    () => this.transport()?.status() ?? (this.failed() ? 'lost' : 'connecting'),
  );

  readonly connected = computed(() => this.status() === 'connected');
  readonly enabled = this.connected;
  readonly canReconnect = computed(() => this.status() === 'lost' && (this.failed() || !!this.transport()?.reconnect));

  // a control window beside the presentation, rather than another device
  readonly local = signal(false);
  // When the presentation started by this device's clock.
  readonly startedAt = signal<number | null>(null);
  readonly songs = computed<RemoteSong[]>(() => this.state()?.songs ?? []);
  readonly masses = computed<RemoteMass[]>(() => this.state()?.masses ?? []);
  readonly massesStatus = computed<LiturgyStatus>(() => this.state()?.massesStatus ?? 'ready');
  readonly slide = computed(() => this.state()?.slide ?? 0);
  readonly light = computed(() => this.state()?.light ?? false);
  readonly blackout = computed(() => this.state()?.blackout ?? false);
  readonly slides = computed<FlatSlide[]>(() =>
    this.songs().flatMap((song, songIndex) => song.slides.map((slide, inSong) => ({ ...slide, songIndex, inSong }))),
  );

  readonly currentSlide = computed<FlatSlide | null>(() => this.slides()[this.slide()] ?? null);
  readonly nextSlide = computed<FlatSlide | null>(() => this.slides()[this.slide() + 1] ?? null);
  readonly currentIndex = computed(() => this.currentSlide()?.songIndex ?? -1);
  readonly currentSong = computed<RemoteSong | null>(() => this.songs()[this.currentIndex()] ?? null);
  readonly atStart = computed(() => this.slide() <= 0);
  readonly atEnd = computed(() => this.slide() >= this.slides().length - 1);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.pendingAdds.forEach((done) => done(null));
      this.transport()?.close();
    });
  }

  /** Joins a presentation on another device by the room id from its QR code. */
  async joinRoom(roomId: string) {
    this.roomId = roomId;
    this.failed.set(false);

    let relays: RelayControl;
    let selfId: string;

    try {
      [relays, selfId] = await Promise.all([relayControl(), remoteSelfId()]);
    } catch {
      this.failed.set(true);
      return;
    }

    if (!this.destroyed) {
      this.connect(
        new TrysteroClientTransport(
          () => joinRemoteRoom(roomId),
          deviceToken(roomId),
          relays,
          (nonce, proof) => verifyHostProof(roomId, nonce, selfId, proof),
        ),
      );
    }
  }

  /** Joins the presentation open in another window of this browser. */
  joinWindow(presentationId: string) {
    this.local.set(true);
    this.connect(new ChannelClientTransport(channelName(presentationId)));
  }

  connect(transport: ClientTransport) {
    this.transport.set(transport);
    transport.state$.subscribe((state) => this.receive(state));
  }

  send(command: RemoteCommand) {
    this.transport()?.send(command);
  }

  reconnect() {
    const transport = this.transport();

    if (transport) {
      transport.reconnect?.();
    } else if (this.roomId) {
      this.joinRoom(this.roomId);
    }
  }

  next() {
    this.send({ type: 'next' });
  }

  prev() {
    this.send({ type: 'prev' });
  }

  goTo(index: number) {
    const slide = this.slides()[index];
    const song = slide && this.songs()[slide.songIndex];

    if (song) {
      this.send({ type: 'slide', index, id: song.id });
    }
  }

  setLight(light: boolean) {
    this.send({ type: 'theme', light });
  }

  setBlackout(hidden: boolean) {
    this.send({ type: 'blackout', hidden });
  }

  remove(index: number, id: string) {
    this.send({ type: 'remove', index, id });
  }

  move(index: number, id: string, to: number) {
    this.send({ type: 'move', index, id, to });
  }

  add(id: string): Promise<number | null> {
    const request = Math.random().toString(36).slice(2);

    this.send({ type: 'add', id, request });

    return new Promise((resolve) => {
      const timer = setTimeout(() => done(null), ADD_TIMEOUT);
      const done = (index: number | null) => {
        clearTimeout(timer);
        this.pendingAdds.delete(request);
        resolve(index);
      };

      this.pendingAdds.set(request, done);
    });
  }

  resetTimer() {
    this.send({ type: 'resetTimer' });
  }

  refreshMasses() {
    this.send({ type: 'refreshMasses' });
  }

  private receive(state: RemoteState) {
    this.state.set(state);
    state.added.forEach(({ request, index }) => this.pendingAdds.get(request)?.(index));

    this.startedAt.set(Date.now() - state.elapsed);
  }
}

/**
 * Proves to the presentation that this is the device its room belongs to, also after the page was reloaded:
 * a phone often drops a page left in the background.
 */
function deviceToken(roomId: string): string {
  // Only the room of the last scan matters: every other code is dead by now.
  const key = 'remote-control-token';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const fresh = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  try {
    const [storedRoom, stored] = (localStorage.getItem(key) ?? '').split(' ');

    if (storedRoom === roomId && stored) {
      return stored;
    }

    localStorage.setItem(key, `${roomId} ${fresh}`);
  } catch {
    // without storage the token lasts as long as the page
  }

  return fresh;
}
