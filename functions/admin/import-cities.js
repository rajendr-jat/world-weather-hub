// functions/admin/import-cities.js
// Route: /admin/import-cities?cc=in&offset=0&limit=1000&key=YOUR_SECRET
//
// Fetches cities for ONE country at a time from a public JSON API and inserts
// them into D1. Much lighter/more reliable than parsing a giant CSV.
//
// USAGE:
//   India:  ?cc=in&offset=0&limit=1000&key=YOUR_SECRET
//   USA:    ?cc=us&offset=0&limit=1000&key=YOUR_SECRET
//   Any other country: change cc= to that country's 2-letter code (gb, ca, au, etc.)
//
// Follow the "nextUrl" in each response until "done": true.
// DELETE this file once you're done importing (security).

const SECRET_KEY = "mypass2026"; // <-- change this to your own secret

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  if (url.searchParams.get("key") !== SECRET_KEY) {
    return new Response("Unauthorized. Add ?key=YOUR_SECRET to the URL.", { status: 401 });
  }

  const cc = (url.searchParams.get("cc") || "in").toLowerCase();
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000", 10), 1000);
  const maxTotal = parseInt(url.searchParams.get("max") || "999999", 10); // optional cap

  function slugify(name) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${base}-${cc}`;
  }

  try {
    const apiUrl = `https://cdn.jsdelivr.net/npm/geo-data-api@latest/dist/api/v1/cities/country/${cc}.json`;
    const res = await fetch(apiUrl);
    if (!res.ok) {
      return Response.json({ error: "Could not fetch city data for this country code", cc, status: res.status }, { status: 500 });
    }
    const json = await res.json();
    const allCities = json.data || [];
    const totalAvailable = allCities.length;
    const cappedTotal = Math.min(totalAvailable, maxTotal);

    const batch = allCities.slice(offset, Math.min(offset + limit, cappedTotal));

    if (batch.length === 0) {
      return Response.json({ done: true, cc, totalAvailable, message: "No more rows to import for this country." });
    }

    const rows = batch.map(c => {
      const lat = parseFloat(c.latitude);
      const lon = parseFloat(c.longitude);
      if (!c.name || isNaN(lat) || isNaN(lon)) return null;
      return { name: c.name, lat, lon, slug: slugify(c.name) };
    }).filter(Boolean);

    const CHUNK = 20;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const stmts = chunk.map(r =>
        env.DB.prepare(
          `INSERT OR IGNORE INTO cities (city_name, city_slug, country_code, lat, lon) VALUES (?, ?, ?, ?, ?)`
        ).bind(r.name, r.slug, cc, r.lat, r.lon)
      );
      await env.DB.batch(stmts);
      inserted += chunk.length;
    }

    const nextOffset = offset + limit;
    const done = nextOffset >= cappedTotal;

    return Response.json({
      done,
      cc,
      offset,
      inserted,
      totalAvailable,
      nextOffset: done ? null : nextOffset,
      nextUrl: done ? null : `${url.origin}${url.pathname}?cc=${cc}&offset=${nextOffset}&limit=${limit}&max=${maxTotal}&key=${SECRET_KEY}`
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
