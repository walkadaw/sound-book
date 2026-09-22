import { Service, signal } from '@angular/core';
import Reveal, { RevealApi } from 'reveal.js';
import RevealNotes from 'reveal.js/plugin/notes';
import { fromEvent, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

interface NotesPlugin {
  open: () => void;
}

@Service()
export class RevealService {
  readonly ready = signal(false);

  private reveal: RevealApi;
  private initTimer: ReturnType<typeof setTimeout>;
  private updateTimer: ReturnType<typeof setTimeout>;

  isReady(): boolean {
    return this.ready() && !!this.reveal && this.reveal.isReady();
  }

  isShowControls(): boolean {
    return this.isReady() && !!this.reveal.getConfig().controls;
  }

  isSpeakerNotes(): boolean {
    return this.reveal && this.reveal.isSpeakerNotes();
  }

  isPause(): boolean {
    return this.reveal && this.reveal.isPaused();
  }

  getNotesPlugin(): NotesPlugin {
    return this.reveal.getPlugin('notes') as unknown as NotesPlugin;
  }

  getRevealElement(): HTMLElement {
    return this.reveal.getRevealElement();
  }

  getActiveSlide(): number {
    return this.reveal.getState().indexh;
  }

  togglePause(): void {
    this.reveal.togglePause();
  }

  slide(slideNumber: number) {
    this.reveal.slide(slideNumber, 0);
  }

  updateRevealState() {
    // Hack for update state for Reveal
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      if (this.reveal) {
        this.reveal.setState(this.reveal.getState());
      }
    }, 0);
  }

  /** Removes Reveal's window/document listeners; call it on leaving the presentation (the service is a singleton). */
  destroy() {
    clearTimeout(this.initTimer);
    clearTimeout(this.updateTimer);
    this.ready.set(false);

    if (this.reveal) {
      this.reveal.destroy();
      this.reveal = undefined;
    }
  }

  onSlideChange(): Observable<number> {
    return fromEvent(this.reveal.getRevealElement(), 'slidechanged').pipe(
      filter<any>((event) => !!event && event.indexh >= 0),
      map(({ indexh }) => indexh),
    );
  }

  init() {
    this.destroy();
    this.initTimer = setTimeout(() => {
      const reveal = new Reveal({
        plugins: [RevealNotes],
      });
      this.reveal = reveal;
      reveal
        .initialize({
          controls: true,
          progress: false,
          center: true,
          hash: false,

          transition: 'none',
          // transitionSpeed: 'slow',
          // backgroundTransition: 'slide'

          // The "normal" size of the presentation, aspect ratio will be preserved
          // when the presentation is scaled to fit different resolutions. Can be
          // specified using percentage units.
          // 16:9
          width: 1050,
          height: 590,

          // Factor of the display size that should remain empty around the content
          margin: 0.025,

          // Exposes the reveal.js API through window.postMessage
          postMessage: true,

          // Dispatches all reveal.js events to the parent window through postMessage
          postMessageEvents: false,
        })
        .then(() => this.ready.set(this.reveal === reveal));
    }, 0);
  }
}
