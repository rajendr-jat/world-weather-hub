// functions/sitemap.xml.js
const SITE = "https://world-weather-hub.pages.dev";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "hourly" },
  { path: "/forecast.html", priority: "0.9", changefreq: "hourly" },
  { path: "/aqi.html", priority: "0.9", changefreq: "hourly" },
  { path: "/history.html", priority: "0.7", changefreq: "daily" },
  { path: "/about.html", priority: "0.5", changefreq: "monthly" },
  { path: "/contact.html", priority: "0.5", changefreq: "monthly" },
  { path: "/privacy.html", priority: "0.3", changefreq: "yearly" },
  { path: "/terms.html", priority: "0.3", changefreq: "yearly" },
  { path: "/disclaimer.html", priority: "0.3", changefreq: "yearly" },
  { path: "/cookie.html", priority: "0.3", changefreq: "yearly" }
];

export async function onRequest(context) {
  const { env, request } = context;

  const cache = caches.default;
  let cached = await cache.match(request);
  if (cached) return cached;

  const { results } = await env.DB.prepare(
    `SELECT slug FROM "cities-db"`
  ).all();

  const slugs = results.map(r => r.slug);
  const today = new Date().toISOString().split("T")[0];

  let urls = STATIC_PAGES.map(p => `
  <url>
    <loc>${SITE}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("");

  urls += slugs.map(slug => `
  <url>
    <loc>${SITE}/weather/${slug}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  const response = new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, max-age=3600"
    }
  });

  context.waitUntil(cache.put(request, response.clone()));
  return response;
}
