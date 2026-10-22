import { Service, signal } from '@angular/core';
import { filter, take, timer } from 'rxjs';
import { LiturgySection } from '../../interfaces/liturgy';
import { Slide, SlideList } from '../../interfaces/slide';
import { withoutMarks } from '../chord/song-structure';
import { liturgySlides } from '../liturgy-slides/liturgy-slides';

@Service()
export class SlidesService {
  static readonly AVAILABLE_WIDTH = 1050;
  static readonly AVAILABLE_HEIGHT = 590;
  static readonly FONT_SIZES = [58, 56, 54, 52, 50];
  static readonly LINE_HEIGHT = 1.15;
  static readonly FONTS = {
    web: 'Ubuntu',
    pptx: 'TODO',
  };

  fontSizePx = 60;

  private initState = signal(false);
  readonly init = this.initState.asReadonly();

  private container: HTMLElement;

  constructor() {
    this.initContainer();

    // Костыль инициализации шрифта, почему то без начального редера с
    // кастомным шрифтом. в начале не доступен шрифт даже если он загружен
    // и размер определяется не верно на первых циклах рендера
    this.getLineContend('1. Богу Святому сэрца аддай сваё (x2)', 'web', this.fontSizePx, SlidesService.LINE_HEIGHT);

    timer(100, 50).pipe(
      // TODO magic init fonts
      filter(() => this.container.offsetHeight > 100),
      take(1),
    ).subscribe(() => {
      this.initState.set(true);
    });
  }

  getSongSlide(songText: string, fontName: keyof typeof SlidesService.FONTS = 'web'): Slide[] {
    const slide: Slide[] = [];
    let tmpSlideText = '';
    let line = 0;
    /*
    Первая -
    Вторая  | блок 1
    Третья -

    Первая -
    Вторая  | блок 2
    Третья -
    */
    // "Прыпеў:" marks the text up, the audience only sees the lyrics
    const songBlocks = withoutMarks(songText.replace(/\r/g, '')).split('\n\n');

    songBlocks.forEach((dirtySongBlock) => {
      const songBlock = dirtySongBlock.trim();
      if (songBlock) {
        const maxLine = this.getMaxLine(this.fontSizePx, SlidesService.LINE_HEIGHT);
        const needLine = this.getLineContend(songBlock, fontName, this.fontSizePx, SlidesService.LINE_HEIGHT);

        if (line + needLine > maxLine && tmpSlideText) {
          slide.push({ fontSize: this.fontSizePx, text: tmpSlideText });
          line = 0;
          tmpSlideText = '';
        }

        /*
        если один блок не помещяется в слайд с 60 шрифтом
        - если не влазит чучуть УМЕНЬШАЕМ шрифт
        - если не влазит сильно делим на несколько слайдов равными порциями
        */
        if (needLine > maxLine) {
          slide.push(...this.tryPutBlockInSlide(songBlock, fontName, maxLine, needLine));
        } else {
          tmpSlideText += line > 0 ? `\n\n${songBlock}` : songBlock;
          // when we marge two part of block we need add line
          line += needLine + 1;
        }
      }
    });

    if (tmpSlideText) {
      slide.push({ fontSize: this.fontSizePx, text: tmpSlideText });
    }

    return slide;
  }

  getLiturgySlides(liturgy: string, sections: LiturgySection[]): SlideList[] {
    return liturgySlides(liturgy, sections, {
      lines: (text, fontSize) => this.getLineContend(text, 'web', fontSize, SlidesService.LINE_HEIGHT),
      maxLines: (fontSize) => this.getMaxLine(fontSize, SlidesService.LINE_HEIGHT),
    });
  }

  private initContainer() {
    this.container = document.createElement('div');
    this.container.style.width = `${SlidesService.AVAILABLE_WIDTH}px`;
    this.container.style.position = 'fixed';
    // Moving it above the page is not enough: in the short previews of the speaker view a long text reaches into sight.
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.visibility = 'hidden';
    this.container.style.pointerEvents = 'none';
    document.body.appendChild(this.container);
  }

  private getLineContend(
    text: string,
    fontName: keyof typeof SlidesService.FONTS,
    fontSize: number,
    lineHeight: number,
  ): number {
    if (this.container.style.fontFamily !== SlidesService.FONTS[fontName]) {
      this.container.style.fontFamily = SlidesService.FONTS[fontName];
    }

    if (this.container.style.fontSize !== `${fontSize}px`) {
      this.container.style.fontSize = `${fontSize}px`;
    }

    if (this.container.style.lineHeight !== lineHeight.toString()) {
      this.container.style.lineHeight = lineHeight.toString();
    }

    this.container.innerText = text;

    const height = Math.round(this.container.offsetHeight / (fontSize * lineHeight));

    return height;
  }

  private getMaxLine(fontSize: number, lineHeight: number): number {
    return Math.floor(SlidesService.AVAILABLE_HEIGHT / (fontSize * lineHeight));
  }

  private tryPutBlockInSlide(
    songBlock: string,
    fontName: keyof typeof SlidesService.FONTS,
    hasMaxLine: number,
    hasLines: number,
  ): Slide[] {
    const slide: Slide[] = [];
    let i = 0;
    // Пытаемся отобразить весь блок
    while (i < SlidesService.FONT_SIZES.length) {
      const fontSizePx = SlidesService.FONT_SIZES[i];
      const maxLine = this.getMaxLine(fontSizePx, SlidesService.LINE_HEIGHT);
      const needLine = this.getLineContend(songBlock, fontName, fontSizePx, SlidesService.LINE_HEIGHT);

      if (needLine <= maxLine) {
        slide.push({ fontSize: fontSizePx, text: songBlock });
        break;
      }

      i += 1;
    }

    if (slide.length > 0) {
      return slide;
    }

    // разделяем блок на несколько равных частей
    const howSlideNeed = Math.ceil(hasLines / Math.ceil(hasLines / hasMaxLine));
    let tmpSlideText = '';
    let line = 0;

    songBlock.split('\n').forEach((lineText) => {
      const needLine = this.getLineContend(lineText, fontName, this.fontSizePx, SlidesService.LINE_HEIGHT);
      if (line + needLine > howSlideNeed && tmpSlideText) {
        slide.push({ fontSize: this.fontSizePx, text: tmpSlideText });
        tmpSlideText = '';
        line = 0;
      }

      line += needLine;
      tmpSlideText += `${lineText}\n`;
    });

    if (tmpSlideText) {
      slide.push({ fontSize: this.fontSizePx, text: tmpSlideText });
    }

    return slide;
  }
}
