const SITE = "https://world-weather-hub.pages.dev";
const PER_PAGE = 5000;

export async function onRequest(context) {
  const { env, params, request } = context;

  const page = parseInt(params.page, 10);

  if (!Number.isInteger(page) || page < 1 || page > 9) {
    return new Response("Sitemap not found", { status: 404 });
  }

  const offset = (page - 1) * PER_PAGE;

  try {
    const { results } = await env.DB.prepare(
      `SELECT city_slug
       FROM cities
       ORDER BY city_slug
       LIMIT ? OFFSET ?`
    )
      .bind(PER_PAGE, offset)
      .all();

    const today = new Date().toISOString().split("T")[0];

    const urls = results.map(row => `
  <url>
    <loc>${SITE}/weather/${row.city_slug}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
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

  } catch (err) {
    return new Response(
      `Sitemap generation failed: ${err.message}`,
      { status: 500 }
    );
  }
}
