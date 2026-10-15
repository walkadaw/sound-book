import {
  Component,
  DOCUMENT,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// the part of the YouTube IFrame API the editor uses:
// https://developers.google.com/youtube/iframe_api_reference
interface YoutubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
}

interface YoutubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars: { start?: number; rel?: 0 };
      events: { onReady: () => void };
    },
  ) => YoutubePlayer;
}

type YoutubeWindow = Window & { YT?: YoutubeApi; onYouTubeIframeAPIReady?: () => void };

let youtubeApi: Promise<YoutubeApi> | undefined;

function loadYoutubeApi(document: Document): Promise<YoutubeApi> {
  const window = document.defaultView as YoutubeWindow;

  youtubeApi ??= new Promise<YoutubeApi>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    // the API calls this global once it is ready, so a callback someone else set is kept
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT as YoutubeApi);
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      // lets the next preview try again, e.g. once the network is back
      youtubeApi = undefined;
      script.remove();
      reject(new Error('YouTube IFrame API did not load'));
    };
    document.head.appendChild(script);
  });

  return youtubeApi;
}

@Component({
  selector: 'app-youtube-preview',
  template: `
    @if (failed()) {
      <p role="alert">Не атрымалася загрузіць плэер YouTube</p>
    }
  `,
  // the API puts its iframe in place of an element created here, outside the template's style scope
  encapsulation: ViewEncapsulation.None,
  styles: `
    app-youtube-preview {
      display: block;
    }

    app-youtube-preview iframe {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      border: 0;
      border-radius: 8px;
    }
  `,
})
export class YoutubePreviewComponent {
  readonly videoId = input.required<string>();
  /** seconds; only read when a video is opened, as a new start would reload the player */
  readonly start = input<number | null>(null);

  readonly ready = output<void>();

  protected readonly failed = signal(false);
  private player: YoutubePlayer | null = null;

  constructor() {
    const document = inject(DOCUMENT);
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    effect((onCleanup) => {
      const videoId = this.videoId();
      const start = untracked(this.start);

      if (!isBrowser) {
        return;
      }

      const element = document.createElement('div');
      host.appendChild(element);
      let player: YoutubePlayer | null = null;
      let destroyed = false;

      this.failed.set(false);
      loadYoutubeApi(document).then(
        (api) => {
          if (destroyed) {
            return;
          }

          player = new api.Player(element, {
            videoId,
            width: '100%',
            height: '100%',
            playerVars: start ? { start, rel: 0 } : { rel: 0 },
            events: {
              onReady: () => {
                this.player = player;
                this.ready.emit();
              },
            },
          });
        },
        () => this.failed.set(true),
      );

      onCleanup(() => {
        destroyed = true;
        this.player = null;
        player?.destroy();
        element.remove();
      });
    });
  }

  /** seconds; 0 until the player is ready */
  getCurrentTime(): number {
    return this.player?.getCurrentTime() ?? 0;
  }

  getDuration(): number {
    return this.player?.getDuration() ?? 0;
  }

  play(from: number): void {
    this.player?.seekTo(from, true);
    this.player?.playVideo();
  }
}
