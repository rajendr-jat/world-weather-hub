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
      `SELECT city_slug, city_name, state, country_code, lat, lon FROM cities WHERE city_slug = ?`
    ).bind(slug).first();

    if (!city) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    const shaped = {
      s: city.city_slug,
      n: city.city_name,
      st: city.state,
      c: city.country_code,
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
