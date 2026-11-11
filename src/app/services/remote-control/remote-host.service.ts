import { DestroyRef, Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { SlideList } from '../../interfaces/slide';
import { RevealService } from '../reveal-service/reveal.service';
import { createHostKey } from './host-key';
import { RemoteAdded, RemoteCommand, RemoteMass, RemoteState, remoteSongs } from './remote-control';
import { HostTransport, TrysteroHostTransport, joinRemoteRoom } from './remote-transport';

/** What the presentation lets the remotes see and change. */
export interface PresentationControl {
  slides: Signal<SlideList[]>;
  masses: Signal<RemoteMass[]>;
  /** Returns where the song went in, or null when it could not be added. */
  add(id: string): number | null;
  // A song is named by its index and its id: the presentation leaves it alone when they no longer match.
  remove(index: number, id: string): void;
  move(index: number, id: string, to: number): void;
}

// Enough for the remotes that add at about the same time; each one waits only for its own request.
const ADDED_KEPT = 10;

/** Runs the commands of every remote, over any transport, and keeps all of them on the same state. */
@Injectable()
export class RemoteHost {
  private reveal = inject(RevealService);

  private control = signal<PresentationControl | null>(null);
  private transports = signal<HostTransport[]>([]);
  private subscriptions = new Map<HostTransport, Subscription>();
  private room = signal<TrysteroHostTransport | null>(null);
  // when the presentation started, or when a remote last reset the timer
  private startedAt = signal(Date.now());
  private opening?: Promise<string | null>;
  // Counts the rooms closed, so that a room still opening when it was closed is left at once.
  private generation = 0;

  private added = signal<RemoteAdded[]>([]);

  readonly roomId = signal<string | null>(null);
  /** The last room could not be opened, without the internet say. */
  readonly roomFailed = signal(false);
  readonly remotes = computed(() => this.transports().reduce((sum, transport) => sum + transport.remotes(), 0));
  // the device connected by the QR code or the link, at most one
  readonly devices = computed(() => this.room()?.remotes() ?? 0);
  // The room belongs to a device that is out of touch for now, a locked phone say; only it may come back.
  readonly deviceAway = computed(() => !!this.room()?.owned() && this.devices() === 0);

  // Apart from the rest of the state: it stays the same object while only the slide changes, and then the
  // transports leave it out.
  private program = computed(() => {
    const control = this.control();

    return control && { songs: remoteSongs(control.slides()), masses: control.masses() };
  });

  private state = computed<Omit<RemoteState, 'elapsed'> | null>(() => {
    const program = this.program();

    if (!program) {
      return null;
    }

    return {
      slide: this.reveal.slideIndex(),
      ...program,
      light: this.reveal.light(),
      blackout: this.reveal.paused(),
      remotes: this.remotes(),
      added: this.added(),
    };
  });

  constructor() {
    effect(() => {
      const state = this.state();
      const transports = this.transports();
      const startedAt = this.startedAt();

      if (state) {
        const elapsed = Date.now() - startedAt;

        transports.forEach((transport) => transport.broadcast({ ...state, elapsed }));
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.closeRoom();
      this.transports().forEach((transport) => this.disconnect(transport));
    });
  }

  attach(control: PresentationControl) {
    this.control.set(control);
  }

  connect(transport: HostTransport) {
    this.subscriptions.set(
      transport,
      transport.commands$.subscribe((command) => this.run(command)),
    );
    this.transports.update((transports) => [...transports, transport]);
  }

  disconnect(transport: HostTransport) {
    this.subscriptions.get(transport)?.unsubscribe();
    this.subscriptions.delete(transport);
    this.transports.update((transports) => transports.filter((item) => item !== transport));
    transport.close();
  }

  /** Opens a WebRTC room that remotes on other devices join by its id; null when it could not be opened. */
  openRoom(): Promise<string | null> {
    const current = this.roomId();

    if (current) {
      return Promise.resolve(current);
    }

    if (!this.opening) {
      // an opening cut short by closeRoom must not forget the one that replaced it
      const opening = this.open().finally(() => {
        if (this.opening === opening) {
          this.opening = undefined;
        }
      });

      this.opening = opening;
    }

    return this.opening;
  }

  /** Lets another device connect: the old code stops working, and the device it belonged to with it. */
  newCode(): Promise<string | null> {
    this.closeRoom();

    return this.openRoom();
  }

  /** Disconnects the device and makes its code useless; opening the room again makes a new one. */
  closeRoom() {
    const room = this.room();

    this.generation++;
    this.opening = undefined;

    if (room) {
      this.disconnect(room);
      this.room.set(null);
    }

    this.roomId.set(null);
  }

  private async open(): Promise<string | null> {
    const generation = this.generation;

    this.roomFailed.set(false);

    try {
      const key = await createHostKey();
      const room = await joinRemoteRoom(key.roomId);

      if (generation !== this.generation) {
        room.leave();
        return null;
      }

      const transport = new TrysteroHostTransport(room, key.prove);

      this.room.set(transport);
      this.connect(transport);
      this.roomId.set(key.roomId);

      return key.roomId;
    } catch {
      // the library did not load or the browser has no Web Crypto: no code that nobody would answer
      if (generation === this.generation) {
        this.roomFailed.set(true);
      }

      return null;
    }
  }

  run(command: RemoteCommand) {
    switch (command.type) {
      case 'next':
        this.reveal.next();
        break;
      case 'prev':
        this.reveal.prev();
        break;
      case 'slide':
        if (this.songAt(command.index)?.id === command.id) {
          this.reveal.slide(command.index);
        }
        break;
      case 'theme':
        this.reveal.setLight(command.light);
        break;
      case 'blackout':
        this.reveal.setPaused(command.hidden);
        break;
      case 'add': {
        const control = this.control();

        if (control) {
          const added = { request: command.request, index: control.add(command.id) };

          this.added.update((list) => [...list, added].slice(-ADDED_KEPT));
        }
        break;
      }
      case 'remove':
        this.control()?.remove(command.index, command.id);
        break;
      case 'move':
        this.control()?.move(command.index, command.id, command.to);
        break;
      case 'resetTimer':
        this.startedAt.set(Date.now());
        break;
    }
  }

  private songAt(slide: number): SlideList | undefined {
    return this.control()
      ?.slides()
      .find(({ startIndex = 0, endIndex = 0 }) => startIndex <= slide && slide <= endIndex);
  }
}
