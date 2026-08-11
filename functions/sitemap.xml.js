sitemapLinks SITE = "https://world-weather-hub.pages.dev";

export async function onRequest(context) {
  const sitemapLinks = [];

  sitemapLinks.push(`
  <sitemap>
    <loc>${SITE}/sitemap-static.xml</loc>
  </sitemap>`);

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
