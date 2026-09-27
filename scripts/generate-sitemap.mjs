// Writes sitemap.xml and robots.txt next to the prerendered pages after a production build.
// URLs are taken from each page's <link rel="canonical">, so they match exactly what the app itself declares.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const outDir = 'dist/sound-book/browser';
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/+$/, '');

if (!siteUrl) {
  console.warn('SITE_URL is not set: sitemap.xml and robots.txt are not generated.');
  process.exit(0);
}

const pages = (await readdir(join(outDir, 'song'), { recursive: true })).filter((path) => path.endsWith('index.html'));
const songUrls = [];

for (const page of pages) {
  const html = await readFile(join(outDir, 'song', page), 'utf8');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];

  if (canonical) {
    songUrls.push(canonical);
  }
}

if (!songUrls.length) {
  throw new Error('No prerendered song pages with a canonical URL were found.');
}

const urls = [`${siteUrl}/`, ...songUrls.sort()];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Disallow: /admin
Disallow: /login
Disallow: /api/
Disallow: /share
Disallow: /favorite
Disallow: /playlist

Sitemap: ${siteUrl}/sitemap.xml
`;

await writeFile(join(outDir, 'sitemap.xml'), sitemap);
await writeFile(join(outDir, 'robots.txt'), robots);

console.log(`sitemap.xml: ${urls.length} URLs`);
