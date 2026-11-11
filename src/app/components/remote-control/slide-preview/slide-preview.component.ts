import { Component, input } from '@angular/core';
import { RemoteSlide } from '../../../services/remote-control/remote-control';

/** A slide as the screen shows it, scaled down from the presentation's 1050px wide canvas. */
@Component({
  selector: 'app-slide-preview',
  host: {
    class: 'slide-preview',
    '[class.light]': 'light() && !blackout()',
  },
  template: `
    @if (blackout()) {
      <span class="note">Тэкст схаваны — экран чорны</span>
    } @else if (slide(); as slide) {
      <span class="text" [style.--slide-font-size]="slide.fontSize">{{ slide.text }}</span>
    } @else {
      <span class="note">{{ emptyText() }}</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      aspect-ratio: 16 / 9;
      width: 100%;
      /* the margin Reveal keeps around the slide */
      padding: 2.5%;
      overflow: hidden;
      container-type: inline-size;
      background: #000;
      color: #fff;
      text-align: center;
    }

    :host(.light) {
      background: #fff;
      color: #000;
    }

    .text {
      /* the slide's own size, measured on the 1050px canvas */
      font-size: calc(var(--slide-font-size) / 1050 * 100cqw);
      font-weight: 500;
      line-height: 1.15;
      white-space: pre-line;
    }

    .note {
      padding: 0 1em;
      font-size: var(--app-fs-small);
      color: #c4c6d0;
    }

    :host(.light) .note {
      color: #45464f;
    }
  `,
})
export class SlidePreviewComponent {
  readonly slide = input<RemoteSlide | null>(null);
  readonly light = input(false);
  readonly blackout = input(false);
  readonly emptyText = input('');
}
