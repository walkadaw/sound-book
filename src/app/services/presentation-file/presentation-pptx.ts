import JSZip from 'jszip';
import { Slide } from '../../interfaces/slide';

export interface PptxOptions {
  /** The width in px the slides were laid out for */
  stageWidth: number;
  font: string;
  lineHeight: number;
  /** RRGGBB */
  background: string;
  /** RRGGBB */
  color: string;
}

// 16:9 in EMU, 12700 to a point
const SLIDE_WIDTH = 12192000;
const SLIDE_HEIGHT = 6858000;
const EMU_PER_PT = 12700;
// Reveal fits its stage into the screen less this margin, so the text keeps the same size against the slide.
const MARGIN = 0.025;

const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const NAMESPACES = `xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"`;
const HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_RELATIONSHIPS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument';
const EMPTY_TREE =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
  '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

// XML 1.0 has no place for most control characters, U+FFFE, U+FFFF and lone surrogates (the u flag keeps pairs whole)
const escapeXml = (text: string) =>
  text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿\ud800-\udfff]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

interface Relationship {
  type: string;
  target: string;
}

const relationshipId = (list: Relationship[], item: Relationship) => `rId${list.indexOf(item) + 1}`;

function relationships(list: Relationship[]): string {
  const items = list.map(
    (item) => `<Relationship Id="${relationshipId(list, item)}" Type="${REL}/${item.type}" Target="${item.target}"/>`,
  );

  return `${HEADER}<Relationships xmlns="${NS_RELATIONSHIPS}">${items.join('')}</Relationships>`;
}

function contentTypes(slideCount: number): string {
  const part = (name: string, type: string) =>
    `<Override PartName="${name}" ContentType="${CONTENT_TYPE}.${type}+xml"/>`;
  const slides = Array.from({ length: slideCount }, (_, index) =>
    part(`/ppt/slides/slide${index + 1}.xml`, 'presentationml.slide'),
  );

  return (
    `${HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    part('/ppt/presentation.xml', 'presentationml.presentation.main') +
    part('/ppt/slideMasters/slideMaster1.xml', 'presentationml.slideMaster') +
    part('/ppt/slideLayouts/slideLayout1.xml', 'presentationml.slideLayout') +
    part('/ppt/theme/theme1.xml', 'theme') +
    part('/ppt/presProps.xml', 'presentationml.presProps') +
    part('/ppt/viewProps.xml', 'presentationml.viewProps') +
    part('/ppt/tableStyles.xml', 'presentationml.tableStyles') +
    slides.join('') +
    '</Types>'
  );
}

function presentation(masterId: string, slideIds: string[]): string {
  const slides = slideIds.map((id, index) => `<p:sldId id="${256 + index}" r:id="${id}"/>`);

  return (
    `${HEADER}<p:presentation ${NAMESPACES}>` +
    `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="${masterId}"/></p:sldMasterIdLst>` +
    `<p:sldIdLst>${slides.join('')}</p:sldIdLst>` +
    `<p:sldSz cx="${SLIDE_WIDTH}" cy="${SLIDE_HEIGHT}"/><p:notesSz cx="6858000" cy="9144000"/>` +
    '</p:presentation>'
  );
}

// the background is set once here for every slide
function slideMaster({ background }: PptxOptions): string {
  return (
    `${HEADER}<p:sldMaster ${NAMESPACES}><p:cSld>` +
    `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>` +
    `<p:spTree>${EMPTY_TREE}</p:spTree></p:cSld>` +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3"' +
    ' accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    '<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>' +
    '</p:sldMaster>'
  );
}

function slideLayout(): string {
  return (
    `${HEADER}<p:sldLayout ${NAMESPACES} type="blank" preserve="1">` +
    `<p:cSld name="Blank"><p:spTree>${EMPTY_TREE}</p:spTree></p:cSld>` +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sldLayout>'
  );
}

function theme({ font, background, color }: PptxOptions): string {
  const colors = [
    ['dk1', color],
    ['lt1', background],
    ['dk2', color],
    ['lt2', background],
    ['accent1', 'AA2233'],
    ['accent2', '911D2B'],
    ['accent3', 'D63347'],
    ['accent4', '777777'],
    ['accent5', 'AAAAAA'],
    ['accent6', '555555'],
    ['hlink', 'AA2233'],
    ['folHlink', '911D2B'],
  ].map(([name, value]) => `<a:${name}><a:srgbClr val="${value}"/></a:${name}>`);
  const fonts = `<a:latin typeface="${escapeXml(font)}"/><a:ea typeface=""/><a:cs typeface=""/>`;
  const fill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';

  return (
    `${HEADER}<a:theme xmlns:a="${NS_A}" name="Sound book"><a:themeElements>` +
    `<a:clrScheme name="Sound book">${colors.join('')}</a:clrScheme>` +
    '<a:fontScheme name="Sound book">' +
    `<a:majorFont>${fonts}</a:majorFont><a:minorFont>${fonts}</a:minorFont>` +
    '</a:fontScheme>' +
    '<a:fmtScheme name="Sound book">' +
    `<a:fillStyleLst>${fill.repeat(3)}</a:fillStyleLst>` +
    `<a:lnStyleLst>${`<a:ln w="9525">${fill}</a:ln>`.repeat(3)}</a:lnStyleLst>` +
    `<a:effectStyleLst>${'<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)}</a:effectStyleLst>` +
    `<a:bgFillStyleLst>${fill.repeat(3)}</a:bgFillStyleLst>` +
    '</a:fmtScheme></a:themeElements></a:theme>'
  );
}

function slide({ fontSize, text }: Slide, { stageWidth, font, lineHeight, color }: PptxOptions): string {
  const points = (fontSize * SLIDE_WIDTH * (1 - MARGIN)) / EMU_PER_PT / stageWidth;
  // exact points, as PowerPoint counts a percentage from the font's own line height, not from its size
  const lineSpacing = Math.round(points * lineHeight * 100);
  const spacing = `<a:pPr algn="ctr"><a:lnSpc><a:spcPts val="${lineSpacing}"/></a:lnSpc></a:pPr>`;
  const runProps = (tag: string) =>
    `<a:${tag} lang="be-BY" sz="${Math.round(points * 100)}" dirty="0">` +
    `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>` +
    `<a:latin typeface="${escapeXml(font)}"/><a:cs typeface="${escapeXml(font)}"/></a:${tag}>`;
  // a blank line between stanzas keeps its height
  const paragraphs = text
    .replace(/\s+$/, '')
    .split('\n')
    .map((line) =>
      line
        ? `<a:p>${spacing}<a:r>${runProps('rPr')}<a:t>${escapeXml(line)}</a:t></a:r></a:p>`
        : `<a:p>${spacing}${runProps('endParaRPr')}</a:p>`,
    );
  const inset = (size: number) => Math.round((size * MARGIN) / 2);

  return (
    `${HEADER}<p:sld ${NAMESPACES}><p:cSld><p:spTree>${EMPTY_TREE}` +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Text"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
    `<p:spPr><a:xfrm><a:off x="${inset(SLIDE_WIDTH)}" y="${inset(SLIDE_HEIGHT)}"/>` +
    `<a:ext cx="${SLIDE_WIDTH - 2 * inset(SLIDE_WIDTH)}" cy="${SLIDE_HEIGHT - 2 * inset(SLIDE_HEIGHT)}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>' +
    '<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"><a:noAutofit/></a:bodyPr>' +
    `<a:lstStyle/>${paragraphs.join('')}</p:txBody></p:sp>` +
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
  );
}

/** The slides as the presentation shows them: one text box each, centred, with the same font size and line breaks. */
export async function buildPptx(slides: readonly Slide[], options: PptxOptions): Promise<Uint8Array> {
  const zip = new JSZip();
  const master = 'slideMasters/slideMaster1.xml';
  const layout = 'slideLayouts/slideLayout1.xml';

  zip.file('[Content_Types].xml', contentTypes(slides.length));
  zip.file('_rels/.rels', relationships([{ type: 'officeDocument', target: 'ppt/presentation.xml' }]));
  const masterPart = { type: 'slideMaster', target: master };
  const slideParts = slides.map((_, index) => ({ type: 'slide', target: `slides/slide${index + 1}.xml` }));
  const parts = [
    masterPart,
    { type: 'theme', target: 'theme/theme1.xml' },
    { type: 'presProps', target: 'presProps.xml' },
    { type: 'viewProps', target: 'viewProps.xml' },
    { type: 'tableStyles', target: 'tableStyles.xml' },
    ...slideParts,
  ];
  const idOf = (part: Relationship) => relationshipId(parts, part);

  zip.file('ppt/presentation.xml', presentation(idOf(masterPart), slideParts.map(idOf)));
  zip.file('ppt/_rels/presentation.xml.rels', relationships(parts));
  zip.file(`ppt/${master}`, slideMaster(options));
  zip.file(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    relationships([
      { type: 'slideLayout', target: `../${layout}` },
      { type: 'theme', target: '../theme/theme1.xml' },
    ]),
  );
  zip.file(`ppt/${layout}`, slideLayout());
  zip.file(
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    relationships([{ type: 'slideMaster', target: `../${master}` }]),
  );
  zip.file('ppt/theme/theme1.xml', theme(options));
  zip.file('ppt/presProps.xml', `${HEADER}<p:presentationPr ${NAMESPACES}/>`);
  zip.file('ppt/viewProps.xml', `${HEADER}<p:viewPr ${NAMESPACES}/>`);
  zip.file(
    'ppt/tableStyles.xml',
    `${HEADER}<a:tblStyleLst xmlns:a="${NS_A}" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`,
  );

  slides.forEach((item, index) => {
    zip.file(`ppt/slides/slide${index + 1}.xml`, slide(item, options));
    zip.file(
      `ppt/slides/_rels/slide${index + 1}.xml.rels`,
      relationships([{ type: 'slideLayout', target: `../${layout}` }]),
    );
  });

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
