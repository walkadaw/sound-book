import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';
import { RevealService } from '../reveal-service/reveal.service';
import { PresentationFileService } from './presentation-file.service';

describe('PresentationFileService', () => {
  let revealElement: HTMLElement;
  let downloaded: Blob | undefined;
  let fileName: string | undefined;

  beforeEach(() => {
    revealElement = document.createElement('div');
    document.body.appendChild(revealElement);
    downloaded = undefined;
    fileName = undefined;

    // jsdom has no object URLs and does not follow the link
    URL.createObjectURL = vi.fn((blob: Blob) => {
      downloaded = blob;
      return 'blob:pptx';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      fileName = this.download;
    });

    TestBed.configureTestingModule({
      providers: [{ provide: RevealService, useValue: { getRevealElement: () => revealElement } }],
    });
  });

  afterEach(() => {
    revealElement.remove();
    document.body.style.backgroundColor = '';
    vi.restoreAllMocks();
  });

  const download = async () => {
    await TestBed.inject(PresentationFileService).downloadPptx([{ fontSize: 60, text: 'Тэкст' }]);

    const zip = await JSZip.loadAsync(await (downloaded as Blob).arrayBuffer());

    return {
      master: (await zip.file('ppt/slideMasters/slideMaster1.xml')?.async('string')) ?? '',
      slide: (await zip.file('ppt/slides/slide1.xml')?.async('string')) ?? '',
    };
  };

  it('should take the colors of the theme on the screen', async () => {
    document.body.style.backgroundColor = '#fff';
    revealElement.style.color = 'rgb(0, 0, 0)';

    const { master, slide } = await download();

    expect(master).toContain('<a:srgbClr val="FFFFFF"/>');
    expect(slide).toContain('<a:srgbClr val="000000"/>');

    document.body.style.backgroundColor = 'rgb(34, 34, 34)';
    revealElement.style.color = '#eee';

    const dark = await download();

    expect(dark.master).toContain('<a:srgbClr val="222222"/>');
    expect(dark.slide).toContain('<a:srgbClr val="EEEEEE"/>');
  });

  it('should lay the slides out as the presentation does', async () => {
    const { slide } = await download();
    // 60 px of the 1050 px stage with the line height of 1.15
    const points = (60 * 960 * 0.975) / 1050;

    expect(slide).toContain(`sz="${Math.round(points * 100)}"`);
    expect(slide).toContain(`<a:spcPts val="${Math.round(points * 1.15 * 100)}"/>`);
    expect(slide).toContain('<a:latin typeface="Ubuntu"/>');
    expect(downloaded?.type).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    expect(fileName).toBe('Prezentacyja.pptx');
  });
});
