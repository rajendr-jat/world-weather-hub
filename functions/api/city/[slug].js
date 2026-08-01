// functions/api/city/[slug].js
// Route: /api/city/<slug>  ->  returns { s, n, st, c, lat, lon } or 404

export async function onRequest(context) {
  const { env, params, request } = context;
  const slug = params.slug;

  const cache = caches.default;
  let cached = await cache.match(request);
  if (cached) return cached;

  try {
    const city = await env.DB.prepare(
      `SELECT slug, name, state, country, lat, lon FROM "cities-db" WHERE slug = ?`
    ).bind(slug).first();

    if (!city) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    const shaped = {
      s: city.slug,
      n: city.name,
      st: city.state,
      c: city.country,
      lat: city.lat,
      lon: city.lon
    };

    const response = Response.json(shaped, {
      headers: { "Cache-Control": "public, max-age=3600" }
    });
    context.waitUntil(cache.put(request, response.clone()));
    return response;
  } catch (err) {
    return Response.json({ error: "lookup failed" }, { status: 500 });
  }
}
