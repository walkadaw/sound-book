import { DOCUMENT, Service, inject } from '@angular/core';
import { Slide } from '../../interfaces/slide';
import { downloadFile } from '../../utils/download-file';
import { RevealService } from '../reveal-service/reveal.service';
import { SlidesService } from '../slides/slides.service';

const PPTX_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// the browser computes colors as "rgb(34, 34, 34)"
function hexColor(css: string): string {
  const [red = 0, green = 0, blue = 0] = css.match(/[\d.]+/g)?.map(Number) ?? [];

  return [red, green, blue]
    .map((part) => Math.round(part).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

@Service()
export class PresentationFileService {
  private document = inject(DOCUMENT);
  private reveal = inject(RevealService);

  /** The file takes the colors of the theme on the screen. */
  async downloadPptx(slides: Slide[]): Promise<void> {
    const background = hexColor(getComputedStyle(this.document.body).backgroundColor);
    const color = hexColor(getComputedStyle(this.reveal.getRevealElement()).color);
    // jszip is only needed for the file, so it is loaded on demand
    const { buildPptx } = await import('./presentation-pptx');
    const file = await buildPptx(slides, {
      stageWidth: SlidesService.AVAILABLE_WIDTH,
      // the slides are split by the lines of this font
      font: SlidesService.FONTS.web,
      lineHeight: SlidesService.LINE_HEIGHT,
      background,
      color,
    });

    downloadFile(this.document, new Blob([file as BlobPart], { type: PPTX_TYPE }), 'Prezentacyja.pptx');
  }
}
