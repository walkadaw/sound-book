import { Service, signal } from '@angular/core';
import Reveal, { RevealApi } from 'reveal.js';
import { fromEvent, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@Service()
export class RevealService {
  readonly ready = signal(false);
  // The one source of truth for what the screen shows, for the menu and for every remote.
  readonly slideIndex = signal(0);
  readonly paused = signal(false);
  readonly light = signal(false);
  // Names the channel the control windows of this presentation listen on, so two presentations open at once stay apart.
  // Kept by the tab, so that a control window finds the presentation again after it was reloaded.
  readonly presentationId = tabPresentationId();

  private reveal: RevealApi;
  private initTimer: ReturnType<typeof setTimeout>;
  private updateTimer: ReturnType<typeof setTimeout>;
  // set while the slides change under the screen, which is no move of the reader's
  private keepingPlace = false;

  isReady(): boolean {
    return this.ready() && !!this.reveal && this.reveal.isReady();
  }

  isShowControls(): boolean {
    return this.isReady() && !!this.reveal.getConfig().controls;
  }

  getRevealElement(): HTMLElement {
    return this.reveal.getRevealElement();
  }

  togglePause(): void {
    this.reveal.togglePause();
  }

  // A remote may send these while the presentation is still loading: there is nothing to move yet.
  setPaused(paused: boolean): void {
    this.reveal?.togglePause(paused);
  }

  /** Black text on white instead of white on black. */
  setLight(light: boolean): void {
    this.light.set(light);
    document.body.classList.toggle('white', light);
  }

  slide(slideNumber: number) {
    this.reveal?.slide(slideNumber, 0);
  }

  next(): void {
    this.reveal?.next();
  }

  prev(): void {
    this.reveal?.prev();
  }

  /** Makes Reveal pick up changed slides, on the given slide or on the one it shows. */
  updateRevealState(indexh?: number) {
    // Hack for update state for Reveal
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      if (this.reveal) {
        const state = this.reveal.getState();

        this.keepingPlace = true;
        this.reveal.setState(indexh === undefined ? state : { ...state, indexh, indexv: 0 });
        this.keepingPlace = false;
        this.slideIndex.set(this.reveal.getState().indexh);
      }
    }, 0);
  }

  /** Removes Reveal's window/document listeners; call it on leaving the presentation (the service is a singleton). */
  destroy() {
    clearTimeout(this.initTimer);
    clearTimeout(this.updateTimer);
    this.ready.set(false);
    this.slideIndex.set(0);
    this.paused.set(false);
    this.setLight(false);

    if (this.reveal) {
      this.reveal.destroy();
      this.reveal = undefined;
    }
  }

  /** The reader moving to another slide; not the slides changing under the screen. */
  onSlideChange(): Observable<number> {
    return fromEvent(this.reveal.getRevealElement(), 'slidechanged').pipe(
      filter(() => !this.keepingPlace),
      filter<any>((event) => !!event && event.indexh >= 0),
      map(({ indexh }) => indexh),
    );
  }

  init() {
    this.destroy();
    this.initTimer = setTimeout(() => {
      const reveal = new Reveal();
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
        })
        .then(() => {
          if (this.reveal !== reveal) {
            return;
          }

          reveal.on('slidechanged', (event) => this.slideIndex.set((event as Event & { indexh: number }).indexh));
          reveal.on('paused', () => this.paused.set(true));
          reveal.on('resumed', () => this.paused.set(false));
          this.slideIndex.set(reveal.getState().indexh);
          this.ready.set(true);
        });
    }, 0);
  }
}

function tabPresentationId(): string {
  const key = 'remote-presentation-id';
  const fresh = Math.random().toString(36).slice(2);
  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

  try {
    const stored = sessionStorage.getItem(key);

    // A duplicated tab, or one opened from this one, starts with a copy of the storage, so only a reload keeps the id.
    if (stored && navigation?.type === 'reload') {
      return stored;
    }

    sessionStorage.setItem(key, fresh);
  } catch {
    // without storage the windows reconnect only until the presentation is reloaded
  }

  return fresh;
}
