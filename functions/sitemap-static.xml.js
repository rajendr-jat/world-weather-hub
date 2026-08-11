const SITE = "https://world-weather-hub.pages.dev";

const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "hourly" },
  { path: "/forecast.html", priority: "0.9", changefreq: "hourly" },
  { path: "/aqi.html", priority: "0.9", changefreq: "hourly" },
  { path: "/history.html", priority: "0.7", changefreq: "daily" }
];

export async function onRequest(context) {
  const urls = STATIC_PAGES.map(p => `
  <url>
    <loc>${SITE}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
