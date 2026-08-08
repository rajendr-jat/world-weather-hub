// functions/sitemap.xml.js
const SITE = "https://world-weather-hub.pages.dev";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "hourly" },
  { path: "/forecast", priority: "0.9", changefreq: "hourly" },
  { path: "/aqi", priority: "0.9", changefreq: "hourly" },
  { path: "/history", priority: "0.7", changefreq: "daily" }
];

export async function onRequest(context) {
  const { env, request } = context;

  const cache = caches.default;
  let cached = await cache.match(request);
  if (cached) return cached;

  try {
    const { results } = await env.DB.prepare(
      `SELECT city_slug FROM cities`
    ).all();

    const slugs = results.map(r => r.city_slug);
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
  } catch (err) {
    return new Response("Sitemap generation failed", { status: 500 });
  }
}
