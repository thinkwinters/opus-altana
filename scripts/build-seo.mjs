import { cp, readFile, rm, writeFile } from 'node:fs/promises';

const source = new URL('../dist/', import.meta.url);
const output = new URL('../dist-vercel/', import.meta.url);
const domain = process.env.SITE_URL?.trim() || 'https://opusaltanacondominio.com/';
const isPreview = ['preview', 'development'].includes(process.env.VERCEL_ENV);
const headSlot = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;

function getSiteUrl(value) {
  if (!value) return null;
  const url = new URL(value.includes('://') ? value : 'https://' + value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL deve ser a URL HTTPS da página inicial.');
  }
  return url;
}

const siteUrl = getSiteUrl(domain);

function updateHead(html, { path, main }) {
  const robotPolicy = main && !isPreview
    ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    : 'noindex, follow';
  const tags = ['<meta name="robots" content="' + robotPolicy + '">'];

  if (siteUrl) {
    const canonical = new URL(path, siteUrl).href;
    tags.push('<link rel="canonical" href="' + canonical + '">');
    if (main) {
      const photo = new URL('assets/portaria-1280.webp', siteUrl).href;
      const photoAlt = 'Perspectiva ilustrativa da portaria social do Opus Altana';
      tags.push(
        '<meta property="og:url" content="' + canonical + '">',
        '<meta property="og:image" content="' + photo + '">',
        '<meta property="og:image:type" content="image/webp">',
        '<meta property="og:image:width" content="1280">',
        '<meta property="og:image:height" content="710">',
        '<meta property="og:image:alt" content="' + photoAlt + '">',
        '<meta name="twitter:image" content="' + photo + '">',
        '<meta name="twitter:image:alt" content="' + photoAlt + '">'
      );
    }
  }

  if (!headSlot.test(html)) throw new Error('Área de metadados ausente em ' + path);
  return html.replace(headSlot, ['<!-- seo:start -->', ...tags, '<!-- seo:end -->'].join('\n  '));
}

function absolutizeStructuredData(html) {
  const block = /(<script type="application\/ld\+json" id="altana-structured-data">)([\s\S]*?)(<\/script>)/;
  if (!block.test(html)) throw new Error('Dados estruturados do empreendimento ausentes.');
  const urlFields = new Set(['@id', 'url', 'image']);
  return html
    .replace(block, (_match, start, data, end) => {
      const graph = JSON.parse(data);
      const json = JSON.stringify(graph, (key, value) =>
        urlFields.has(key) && typeof value === 'string' ? new URL(value, siteUrl).href : value,
      2);
      return start + '\n  ' + json.replaceAll('\n', '\n  ') + '\n  ' + end;
    })
    .replace('itemid="#faq"', 'itemid="' + new URL('#faq', siteUrl).href + '"');
}

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

// Identificadores públicos opcionais; não coloque credenciais nesta substituição.
const gtmContainer = process.env.GTM_CONTAINER_ID?.trim() || 'GTM-T83GNS9';
const pixelId = process.env.META_PIXEL_ID?.trim() || '1292606731496968';
if (!/^GTM-[A-Z0-9]+$/.test(gtmContainer) || !/^\d+$/.test(pixelId)) {
  throw new Error('GTM_CONTAINER_ID e META_PIXEL_ID devem conter identificadores válidos.');
}
const trackingTarget = new URL('tracking.js', output);
const trackingSource = await readFile(trackingTarget, 'utf8');
if (!trackingSource.includes("'GTM-T83GNS9'") || !trackingSource.includes("'1292606731496968'")) {
  throw new Error('Identificadores base do tracking não encontrados.');
}
await writeFile(trackingTarget, trackingSource
  .replace("const containerId = 'GTM-T83GNS9';", "const containerId = '" + gtmContainer + "';")
  .replace("const pixelId = '1292606731496968';", "const pixelId = '" + pixelId + "';"));

for (const [file, path, main] of [
  ['index.html', '/', true],
  ['politica-de-privacidade.html', '/politica-de-privacidade.html', false]
]) {
  const target = new URL(file, output);
  let html = updateHead(await readFile(target, 'utf8'), { path, main });
  if (main && siteUrl) html = absolutizeStructuredData(html);
  await writeFile(target, html);
}

const robots = ['User-agent: *', 'Allow: /', 'Disallow: /api/'];
if (siteUrl && !isPreview) {
  robots.push('', 'Sitemap: ' + new URL('sitemap.xml', siteUrl).href);
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + '  <url><loc>' + siteUrl.href + '</loc></url>\n'
    + '</urlset>\n';
  await writeFile(new URL('sitemap.xml', output), sitemap);
}
await writeFile(new URL('robots.txt', output), robots.join('\n') + '\n');
