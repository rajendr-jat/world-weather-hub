const SITE = "https://world-weather-hub.pages.dev";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "hourly" },
  { path: "/forecast", priority: "0.9", changefreq: "hourly" },
  { path: "/aqi", priority: "0.9", changefreq: "hourly" },
  { path: "/history", priority: "0.7", changefreq: "daily" }
];

export async function onRequest(context) {
  const { request } = context;

  const urls = STATIC_PAGES.map(p => `
  <url>
    <loc>${SITE}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("");

  const sitemapLinks = [];

  for (let page = 1; page <= 9; page++) {
    sitemapLinks.push(`
  <sitemap>
    <loc>${SITE}/sitemap-cities/${page}.xml</loc>
  </sitemap>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapLinks.join("")}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
