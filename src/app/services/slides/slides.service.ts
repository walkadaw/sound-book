import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  filter, takeUntil, timer,
} from 'rxjs';
import { Slide } from '../../interfaces/slide';

@Injectable({
  providedIn: 'root',
})
export class SlidesService {
  static readonly AVAILABLE_WIDTH = 1050;
  static readonly AVAILABLE_HEIGHT = 590;
  static readonly FONT_SIZES = [58, 56, 54, 52, 50];
  static readonly FONTS = {
    web: 'Ubuntu',
    pptx: 'TODO',
  };

  fontSizePx = 60;
  lineHeight = 1.15;
  init$ = new BehaviorSubject<boolean>(false);

  private container: HTMLElement;

  constructor() {
    this.initContainer();

    // Костыль инициализации шрифта, почему то без начального редера с
    // кастомным шрифтом. в начале не доступен шрифт даже если он загружен
    // и размер определяется не верно на первых циклах рендера
    this.getLineContend('1. Богу Святому сэрца аддай сваё (x2)', 'web', this.fontSizePx, this.lineHeight);

    timer(100, 50).pipe(
      // TODO magic init fonts
      filter(() => this.container.offsetHeight > 100),
      takeUntil(this.init$.pipe(filter(Boolean))),
    ).subscribe(() => {
      this.init$.next(true);
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
    const songBlocks = songText.replace(/\r/g, '').split('\n\n');

    songBlocks.forEach((dirtySongBlock) => {
      const songBlock = dirtySongBlock.trim();
      if (songBlock) {
        const maxLine = this.getMaxLine(this.fontSizePx, this.lineHeight);
        const needLine = this.getLineContend(songBlock, fontName, this.fontSizePx, this.lineHeight);

        if (line + needLine > maxLine && tmpSlideText) {
          slide.push({ fontSize: this.fontSizePx.toString(), text: tmpSlideText });
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
      slide.push({ fontSize: '60', text: tmpSlideText });
    }

    return slide;
  }

  private initContainer() {
    this.container = document.createElement('div');
    this.container.style.width = `${SlidesService.AVAILABLE_WIDTH}px`;
    this.container.style.position = 'fixed';
    this.container.style.top = '-100%';
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
      const maxLine = this.getMaxLine(fontSizePx, this.lineHeight);
      const needLine = this.getLineContend(songBlock, fontName, fontSizePx, this.lineHeight);

      if (needLine <= maxLine) {
        slide.push({ fontSize: fontSizePx.toString(), text: songBlock });
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
      const needLine = this.getLineContend(lineText, fontName, this.fontSizePx, this.lineHeight);
      if (line + needLine > howSlideNeed && tmpSlideText) {
        slide.push({ fontSize: this.fontSizePx.toString(), text: tmpSlideText });
        tmpSlideText = '';
        line = 0;
      }

      line += needLine;
      tmpSlideText += `${lineText}\n`;
    });

    if (tmpSlideText) {
      slide.push({ fontSize: this.fontSizePx.toString(), text: tmpSlideText });
    }

    return slide;
  }
}
