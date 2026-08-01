// functions/api/cities.js
// Route: /api/cities?q=jaipur

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return Response.json([]);
  }

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  let cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const { results } = await env.DB.prepare(
      `SELECT city_slug, city_name, country_code, lat, lon
       FROM cities
       WHERE city_name LIKE ?
       ORDER BY
         CASE WHEN city_name LIKE ? THEN 0 ELSE 1 END,
         city_name ASC
       LIMIT 6`
    ).bind(`%${q}%`, `${q}%`).all();

    const shaped = results.map(r => ({
      n: r.city_name,
      st: null,
      c: r.country_code,
      lat: r.lat,
      lon: r.lon,
      s: r.city_slug
    }));

    const response = Response.json(shaped, {
      headers: { "Cache-Control": "public, max-age=3600" }
    });

    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
