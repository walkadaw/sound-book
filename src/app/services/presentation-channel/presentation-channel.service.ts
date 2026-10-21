import { DestroyRef, Injectable, inject } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, share } from 'rxjs/operators';
import { Liturgy } from '../../interfaces/liturgy';
import { RevealService } from '../reveal-service/reveal.service';

// What the windows of one presentation tell each other: the main one and the two previews of the speaker view.
export type PresentationMessage =
  | { type: 'addSong'; id: string }
  | { type: 'removeSong'; index: number }
  | { type: 'hideMenu'; hidden: boolean }
  | { type: 'changeTheme' }
  | { type: 'requestState' }
  | { type: 'state'; hidden: boolean; slide: number }
  | { type: 'requestLiturgy' }
  | { type: 'liturgy'; masses: Liturgy[] };

/** Provided by the presentation, so the channel closes with it. */
@Injectable()
export class PresentationChannel {
  // BroadcastChannel reaches every other window of the presentation, but not the one that sends.
  private channel = new BroadcastChannel(`reveal-menu-${inject(RevealService).remoteId}`);

  readonly messages$: Observable<PresentationMessage> = fromEvent<MessageEvent<PresentationMessage>>(
    this.channel,
    'message',
  ).pipe(
    map(({ data }) => data),
    share(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.channel.close());
  }

  send(message: PresentationMessage) {
    this.channel.postMessage(message);
  }
}
