import type { APIRoute } from 'astro';
import { getFullUrl, getOpenBadgesUrl } from '@/config/site';

const OPENBADGES_ORIGIN = process.env.OPENBADGES_ORIGIN || 'https://gdguhu-openbadges.vercel.app';

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().split('T')[0];

  let showcaseCerts: Array<{ loc: string; lastmod: string }> = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${OPENBADGES_ORIGIN}/api/badges/showcase.json`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        showcaseCerts = data.filter((x) => x && typeof x.loc === 'string');
      }
    }
  } catch {
    // Continuar con las URLs principales si Open Badges no responde
  }

  const urls = [
    { loc: getFullUrl('/'), lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: getOpenBadgesUrl('/'), lastmod: today, changefreq: 'weekly', priority: '0.9' },
    { loc: getFullUrl('/cybertrainer/'), lastmod: today, changefreq: 'weekly', priority: '0.9' },
    ...showcaseCerts.map((item) => ({
      loc: item.loc,
      lastmod: item.lastmod || today,
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
