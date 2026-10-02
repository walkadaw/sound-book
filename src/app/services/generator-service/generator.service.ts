import { DOCUMENT, Service, inject } from '@angular/core';
import { PARTS_OF_MASS_TAG_ID, TAGS_LIST } from '../../constants/tag-list';
import { Song } from '../../interfaces/song';
import { PaperOptions } from './songbook-docx';
import { MeasureText } from './songbook-layout';
import { EmbeddedFont, FontStyle } from './songbook-package';
import { FONTS } from './songbook-styles';

const ASSETS = 'assets/songbook';
const FONT_FILES: { family: string; style: FontStyle; file: string }[] = [
  { family: FONTS.text, style: 'regular', file: 'Arsenal-Regular.ttf' },
  { family: FONTS.text, style: 'bold', file: 'Arsenal-Bold.ttf' },
  { family: FONTS.text, style: 'italic', file: 'Arsenal-Italic.ttf' },
  { family: FONTS.text, style: 'boldItalic', file: 'Arsenal-BoldItalic.ttf' },
  { family: FONTS.heading, style: 'regular', file: 'Exo2-SemiBold.ttf' },
  { family: FONTS.chords, style: 'regular', file: 'DejaVuMathTeXGyre.ttf' },
];
const FACE: Record<FontStyle, FontFaceDescriptors> = {
  regular: {},
  bold: { weight: '700' },
  italic: { style: 'italic' },
  boldItalic: { weight: '700', style: 'italic' },
};
const TAG_ICON_IDS = TAGS_LIST.map(({ id }) => id).filter((id) => id !== PARTS_OF_MASS_TAG_ID);
// a canvas measures in CSS pixels, a twip is 1/15 of one
const TWIPS_PER_PX = 15;
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface SongbookAssets {
  fonts: EmbeddedFont[];
  tagIcons: Map<number, Uint8Array>;
}

export interface SongbookResult {
  /** Estimated, Word counts them again when it opens the file */
  pages: number;
}

@Service()
export class GeneratorService {
  private document = inject(DOCUMENT);
  private assets?: Promise<SongbookAssets | undefined>;

  async downloadDocx(songs: Song[], partsOfMass: Song[], options: PaperOptions): Promise<SongbookResult> {
    // docx is large and only needed here, so it is loaded on demand
    const [docx, { buildSongbook }, { packSongbook }, assets] = await Promise.all([
      import('docx'),
      import('./songbook-docx'),
      import('./songbook-package'),
      (this.assets ??= this.loadAssets()),
    ]);
    const measure = assets ? this.textMeasure() : undefined;
    const { document, plan } = buildSongbook(docx, {
      songs,
      partsOfMass,
      options,
      measure,
      tagIcons: assets?.tagIcons,
    });
    const file = await packSongbook(docx, document, assets?.fonts ?? []);

    this.download(new Blob([file as BlobPart], { type: DOCX_TYPE }), 'Spewnik.docx');
    return { pages: plan.pages };
  }

  private download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');

    link.href = url;
    link.download = name;
    link.click();
    // revoking right away can cancel the download in some browsers
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * The fonts are embedded in the file, so it looks the same on any computer,
   * and the browser measures lines with the very same fonts.
   * Without them, Word falls back to its own fonts and line widths are only estimated.
   */
  private async loadAssets(): Promise<SongbookAssets | undefined> {
    const load = async (path: string) => {
      const response = await fetch(new URL(`${ASSETS}/${path}`, this.document.baseURI));

      if (!response.ok) {
        throw new Error(`${path}: ${response.status}`);
      }

      return new Uint8Array(await response.arrayBuffer());
    };

    try {
      const [fonts, icons] = await Promise.all([
        Promise.all(
          FONT_FILES.map(async ({ family, style, file }) => ({ family, style, data: await load(`fonts/${file}`) })),
        ),
        Promise.all(TAG_ICON_IDS.map(async (id) => [id, await load(`tags/tag-${id}.png`)] as const)),
      ]);

      await Promise.all(
        fonts.map(async ({ family, style, data }) => {
          const face = await new FontFace(family, data, FACE[style]).load();
          this.document.fonts.add(face);
        }),
      );

      return { fonts, tagIcons: new Map(icons) };
    } catch (error) {
      console.error('songbook assets', error);
      this.assets = undefined;
      return undefined;
    }
  }

  private textMeasure(): MeasureText | undefined {
    const context = this.document.createElement('canvas').getContext('2d');

    if (!context) {
      return undefined;
    }

    const cache = new Map<string, number>();

    return (text, { font, size, bold, italic, letterSpacing = 0 }) => {
      const css = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size / 2}pt "${font}"`;
      const key = `${css}|${text}`;
      let width = cache.get(key);

      // cached without the letter spacing, which only adds the same amount after every character
      if (width === undefined) {
        context.font = css;
        width = context.measureText(text).width * TWIPS_PER_PX;
        cache.set(key, width);
      }

      return width + text.length * letterSpacing;
    };
  }
}
