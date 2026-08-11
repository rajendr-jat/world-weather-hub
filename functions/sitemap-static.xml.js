const SITE = "https://world-weather-hub.pages.dev";

export async function onRequest(context) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE}/sitemap-static.xml</loc>
  </sitemap>
  <sitemap>
    <loc>${SITE}/sitemap-cities/1.xml</loc>
  </sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": "no-cache"
    }
  });
}
