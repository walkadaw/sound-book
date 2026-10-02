import type { Document } from 'docx';
import JSZip from 'jszip';
import { Docx } from './songbook-styles';

export type FontStyle = 'regular' | 'bold' | 'italic' | 'boldItalic';

export interface EmbeddedFont {
  /** Family name the styles use */
  family: string;
  style: FontStyle;
  data: Uint8Array;
}

const EMBED: Record<FontStyle, string> = {
  regular: 'embedRegular',
  bold: 'embedBold',
  italic: 'embedItalic',
  boldItalic: 'embedBoldItalic',
};
const STYLE_ORDER: FontStyle[] = ['regular', 'bold', 'italic', 'boldItalic'];
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const FONT_RELATIONSHIP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font';

/** ECMA-376 obfuscation of an embedded font: its first 32 bytes are XORed with the key's bytes, last byte first */
export function obfuscateFont(data: Uint8Array, key: string): Uint8Array {
  const hex = key.replace(/[{}-]/g, '');
  const keyBytes = Array.from({ length: 16 }, (_, index) => parseInt(hex.slice(30 - index * 2, 32 - index * 2), 16));
  const result = data.slice();

  for (let index = 0; index < Math.min(32, result.length); index++) {
    result[index] ^= keyBytes[index % 16];
  }

  return result;
}

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// crypto.randomUUID only exists on https pages, random bytes are there everywhere
function fontKey(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}}`;
}

/**
 * The library embeds every font file as a family of its own with only a regular face,
 * so the font table is written here: one family with its bold and italic faces.
 */
function embedFonts(zip: JSZip, fonts: readonly EmbeddedFont[]): void {
  const families = new Map<string, EmbeddedFont[]>();
  fonts.forEach((font) => families.set(font.family, [...(families.get(font.family) ?? []), font]));

  const relationships: string[] = [];
  const entries = [...families].map(([family, faces]) => {
    const embeds = STYLE_ORDER.flatMap((style) => {
      const face = faces.find((font) => font.style === style);

      if (!face) {
        return [];
      }

      const index = relationships.length + 1;
      const key = fontKey();
      zip.file(`word/fonts/font${index}.odttf`, obfuscateFont(face.data, key));
      relationships.push(
        `<Relationship Id="rId${index}" Type="${FONT_RELATIONSHIP}" Target="fonts/font${index}.odttf"/>`,
      );
      return [`<w:${EMBED[style]} r:id="rId${index}" w:fontKey="${key}"/>`];
    });

    return (
      `<w:font w:name="${escapeXml(family)}"><w:family w:val="auto"/><w:pitch w:val="variable"/>`
      + `${embeds.join('')}</w:font>`
    );
  });

  zip.file(
    'word/fontTable.xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + `<w:fonts xmlns:w="${W}" xmlns:r="${R}">${entries.join('')}</w:fonts>`,
  );
  zip.file(
    'word/_rels/fontTable.xml.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + `${relationships.join('')}</Relationships>`,
  );
}

/** Settings the library has no options for, in the order the schema wants them */
async function patchSettings(zip: JSZip, embedsFonts: boolean): Promise<void> {
  const path = 'word/settings.xml';
  const settings = await zip.file(path)!.async('string');
  const added = `${embedsFonts ? '<w:embedTrueTypeFonts/>' : ''}<w:mirrorMargins/>`;

  zip.file(
    path,
    settings.includes('<w:displayBackgroundShape/>')
      ? settings.replace('<w:displayBackgroundShape/>', `<w:displayBackgroundShape/>${added}`)
      : settings.replace(/(<w:settings[^>]*>)/, `$1${added}`),
  );
}

/**
 * The library ends each section with an empty paragraph of its own, which would leave a whole empty line
 * between a song and its verses in two columns, so that paragraph is made 1 pt high.
 */
async function flattenSectionBreaks(zip: JSZip): Promise<void> {
  const path = 'word/document.xml';
  const document = await zip.file(path)!.async('string');

  zip.file(
    path,
    document.replace(
      /<w:p><w:pPr><w:sectPr/g,
      '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>'
        + '<w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:sectPr',
    ),
  );
}

export async function packSongbook(
  docx: Docx,
  document: Document,
  fonts: readonly EmbeddedFont[],
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(await docx.Packer.toArrayBuffer(document));

  if (fonts.length) {
    embedFonts(zip, fonts);
  }

  await patchSettings(zip, fonts.length > 0);
  await flattenSectionBreaks(zip);

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
