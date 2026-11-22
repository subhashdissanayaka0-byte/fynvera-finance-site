// Dynamic XML sitemap for public FYNORIX pages and published Supabase articles.
const SITE_URL = (process.env.SITE_URL || 'https://fynvera-finance-site.vercel.app').replace(/\/$/, '');
const STATIC_PATHS = [
  '/',
  '/about.html',
  '/privacy-policy.html',
  '/terms-of-use.html',
  '/editorial-policy.html',
  '/financial-disclaimer.html',
  '/contact.html'
];

function xmlEscape(value) {
  return String(value ?? '').replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  })[character]);
}

function slugify(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75);
}

function sitemapUrl(loc, lastmod, priority, changefreq) {
  const date = lastmod ? new Date(lastmod) : null;
  const validDate = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    validDate ? `    <lastmod>${validDate}</lastmod>` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].filter(Boolean).join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).setHeader('Cache-Control', 'no-store').send('Sitemap data source is not configured.');
  }

  try {
    const articles = [];
    const pageSize = 1000;
    for (let offset = 0; offset < 10000; offset += pageSize) {
      const endpoint = new URL('/rest/v1/articles', supabaseUrl);
      endpoint.searchParams.set('select', 'id,title,created_at');
      endpoint.searchParams.set('status', 'eq.published');
      endpoint.searchParams.set('order', 'created_at.desc');
      endpoint.searchParams.set('limit', String(pageSize));
      endpoint.searchParams.set('offset', String(offset));

      const response = await fetch(endpoint, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Supabase sitemap query failed (${response.status}): ${detail.slice(0, 300)}`);
      }
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Supabase returned an unexpected sitemap response.');
      articles.push(...rows);
      if (rows.length < pageSize) break;
    }

    const entries = STATIC_PATHS.map((path) => sitemapUrl(`${SITE_URL}${path}`, null, path === '/' ? '1.0' : '0.4', path === '/' ? 'weekly' : 'yearly'));
    for (const article of articles) {
      if (!article?.id || !article?.title) continue;
      const slug = `${slugify(article.title)}-${String(article.id).slice(0, 8)}`;
      const loc = `${SITE_URL}/?article=${encodeURIComponent(slug)}`;
      entries.push(sitemapUrl(loc, article.updated_at || article.created_at, '0.8', 'monthly'));
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries,
      '</urlset>'
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).send(xml);
  } catch (error) {
    console.error('Dynamic sitemap generation failed:', error);
    return res.status(502).setHeader('Cache-Control', 'no-store').send('Could not generate the sitemap right now.');
  }
}
