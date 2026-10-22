import JSZip from 'jszip';
import { buildPptx, PptxOptions } from './presentation-pptx';

const OPTIONS: PptxOptions = {
  stageWidth: 1050,
  font: 'Ubuntu',
  lineHeight: 1.15,
  background: '222222',
  color: 'EEEEEE',
};

async function open(...texts: string[]) {
  const file = await buildPptx(
    texts.map((text) => ({ fontSize: 60, text })),
    OPTIONS,
  );

  return JSZip.loadAsync(file);
}

const read = (zip: JSZip, path: string) => zip.file(path)?.async('string') ?? Promise.resolve('');

describe('buildPptx', () => {
  it('should add a slide for every slide of the presentation', async () => {
    const zip = await open('Першы', 'Другі');
    const presentation = await read(zip, 'ppt/presentation.xml');
    const relationships = await read(zip, 'ppt/_rels/presentation.xml.rels');
    const types = await read(zip, '[Content_Types].xml');

    expect(presentation.match(/<p:sldId /g)?.length).toBe(2);
    expect(presentation).toContain('<p:sldId id="257" r:id="rId7"/>');
    expect(relationships).toMatch(/Id="rId7"[^>]*Target="slides\/slide2.xml"/);
    expect(types).toContain('PartName="/ppt/slides/slide2.xml"');
    expect(zip.file('ppt/slides/slide2.xml')).toBeTruthy();
    expect(zip.file('ppt/slides/slide3.xml')).toBeNull();
  });

  it('should keep the lines and the blank line between stanzas', async () => {
    const zip = await open('Радок 1\nРадок 2\n\nПрыпеў\n');
    const slide = await read(zip, 'ppt/slides/slide1.xml');
    const paragraphs = slide.match(/<a:p>.*?<\/a:p>/g) ?? [];

    expect(paragraphs.length).toBe(4);
    expect(paragraphs[0]).toContain('<a:t>Радок 1</a:t>');
    expect(paragraphs[2]).not.toContain('<a:t>');
    expect(paragraphs[2]).toContain('<a:endParaRPr');
    expect(paragraphs[3]).toContain('<a:t>Прыпеў</a:t>');
  });

  it('should escape the text', async () => {
    // a pair of surrogates stays, a lone one is dropped
    const zip = await open('Хлеб & <"віно">\u0001￿\ud83c 🕊');
    const slide = await read(zip, 'ppt/slides/slide1.xml');

    expect(slide).toContain('<a:t>Хлеб &amp; &lt;&quot;віно&quot;&gt; 🕊</a:t>');
  });

  it('should scale the font size and line height to the slide', async () => {
    const zip = await open('Тэкст');
    const slide = await read(zip, 'ppt/slides/slide1.xml');
    // 60 px of the 1050 px stage, which takes 97.5% of the 960 pt slide
    const points = (60 * 960 * 0.975) / 1050;

    expect(slide).toContain(`sz="${Math.round(points * 100)}"`);
    expect(slide).toContain(`<a:spcPts val="${Math.round(points * 1.15 * 100)}"/>`);
    expect(slide).toContain('<a:srgbClr val="EEEEEE"/>');
    expect(slide).toContain('<a:latin typeface="Ubuntu"/>');
  });

  it('should set the background of every slide', async () => {
    const zip = await open('Тэкст');
    const master = await read(zip, 'ppt/slideMasters/slideMaster1.xml');

    expect(master).toContain('<p:bg><p:bgPr><a:solidFill><a:srgbClr val="222222"/>');
  });
});
