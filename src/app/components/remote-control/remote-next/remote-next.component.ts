import { Component, computed, inject } from '@angular/core';
import { RemoteSession } from '../remote-session.service';
import { SlidePreviewComponent } from '../slide-preview/slide-preview.component';

/** The slide after the current one, as the screen will show it, with what follows it. */
@Component({
  selector: 'app-remote-next',
  imports: [SlidePreviewComponent],
  template: `
    <section aria-labelledby="remote-next-title">
      <div class="head">
        <h2 id="remote-next-title" class="label">Далей</h2>
        @if (nextSongTitle(); as title) {
          <span class="chip song-name">{{ title }}</span>
        }
      </div>
      <app-slide-preview
        class="frame"
        [slide]="session.nextSlide()"
        [light]="session.light()"
        emptyText="Канец праграмы"
      />
      @if (later(); as later) {
        <p class="meta">
          Потым:
          @if (later.slide) {
            слайд {{ later.slide }}
          } @else {
            «<span class="song-name">{{ later.song }}</span
            >»
          }
          @if (later.then) {
            · затым «<span class="song-name">{{ later.then }}</span
            >»
          }
        </p>
      }
    </section>
  `,
  styles: `
    section {
      display: flex;
      flex-direction: column;
      gap: 0.4em;
    }

    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5em;
    }

    .label {
      margin: 0;
      font-family: inherit;
      font-size: var(--app-fs-meta);
      font-weight: 400;
      letter-spacing: normal;
      color: var(--mat-sys-on-surface-variant);
    }

    .chip {
      padding: 0.15em 0.75em;
      border-radius: 999px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font-size: var(--app-fs-meta);
      font-weight: 500;
    }

    /* drawn like the slide on the screen; only that one gets the accent border */
    .frame {
      border: 2px solid var(--mat-sys-outline);
      border-radius: 12px;
    }
  `,
})
export class RemoteNextComponent {
  protected session = inject(RemoteSession);

  // set when the next slide opens another song
  readonly nextSongTitle = computed(() => {
    const next = this.session.nextSlide();

    return next && next.songIndex !== this.session.currentIndex() ? this.session.songs()[next.songIndex].title : null;
  });

  /** "Потым: слайд 4 · затым «ЯГНЁ БОЖАЕ»", or the song the slide after the next one opens. */
  readonly later = computed<{ slide: number | null; song: string | null; then: string | null } | null>(() => {
    const slides = this.session.slides();
    const next = slides[this.session.slide() + 1];
    const after = slides[this.session.slide() + 2];

    if (!next || !after) {
      return null;
    }

    const songs = this.session.songs();

    if (after.songIndex !== next.songIndex) {
      return { slide: null, song: songs[after.songIndex].title, then: null };
    }

    return { slide: after.inSong + 1, song: null, then: songs[next.songIndex + 1]?.title ?? null };
  });
}
