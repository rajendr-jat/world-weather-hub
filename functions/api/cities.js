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
      `SELECT slug, name, state, country, lat, lon
       FROM "cities-db"
       WHERE name LIKE ?
       ORDER BY
         CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
         name ASC
       LIMIT 6`
    ).bind(`%${q}%`, `${q}%`).all();

    const shaped = results.map(r => ({
      n: r.name,
      st: r.state,
      c: r.country,
      lat: r.lat,
      lon: r.lon,
      s: r.slug
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
