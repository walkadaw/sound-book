import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { ConnectionStatus, RemoteCommand, RemoteSong, RemoteState } from '../../services/remote-control/remote-control';
import { ClientTransport } from '../../services/remote-control/remote-transport';

export class FakeClientTransport implements ClientTransport {
  readonly states = new Subject<RemoteState>();
  readonly state$ = this.states.asObservable();
  readonly status = signal<ConnectionStatus>('connected');
  readonly sent: RemoteCommand[] = [];

  send(command: RemoteCommand) {
    this.sent.push(command);
  }

  close() {
    this.status.set('lost');
  }

  reconnect() {
    this.status.set('connecting');
  }
}

function remoteSong(id: string, startIndex: number, slides: number, liturgy: string | null = null): RemoteSong {
  return {
    id,
    title: `Песня ${id}`,
    liturgy,
    startIndex,
    endIndex: startIndex + slides - 1,
    slides: Array.from({ length: slides }, (_, i) => ({ text: `${id} ${i + 1}`, fontSize: 58 })),
    notes: liturgy ? [] : [{ chords: 'Am', text: `Радок ${id}` }],
  };
}

/** A reading and a gospel of mass "l" (slides 0–2), then song 5 (slides 3–4). */
export function remoteState(patch: Partial<RemoteState> = {}): RemoteState {
  return {
    slide: 3,
    songs: [remoteSong('l-0', 0, 1, 'l'), remoteSong('l-1', 1, 2, 'l'), remoteSong('5', 3, 2)],
    masses: [
      { id: 'l', title: 'Чацвер' },
      { id: 'l2', title: 'Успамін' },
    ],
    massesStatus: 'ready',
    light: false,
    blackout: false,
    elapsed: 60_000,
    remotes: 1,
    added: [],
    ...patch,
  };
}
