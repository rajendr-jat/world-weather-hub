// functions/admin/import-cities.js
const SECRET_KEY = "mypass2026"; // apna word rakho

const CSV_URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/csv/cities.csv";

// Kitni cities chahiye har category me
const TARGETS = {
  in: 20000,   // India
  us: 10000,   // USA
  other: 10000 // Baaki sab desh (India, US chhod kar)
};

function slugify(name, countryCode) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${countryCode.toLowerCase()}`;
}

function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  result.push(cur);
  return result;
}

export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  if (url.searchParams.get("key") !== SECRET_KEY) {
    return new Response("Unauthorized. Add ?key=YOUR_SECRET to the URL.", { status: 401 });
  }

  const mode = (url.searchParams.get("mode") || "in").toLowerCase(); // in, us, or other
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "1000", 10), 1000);
  const target = TARGETS[mode] ?? 10000;

  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) {
      return Response.json({ error: "Could not fetch source CSV", status: res.status }, { status: 500 });
    }
    const text = await res.text();
    const lines = text.split("\n").filter(l => l.trim().length > 0);

    const header = parseCSVLine(lines[0]);
    const idxName = header.indexOf("name");
    const idxCountryCode = header.indexOf("country_code");
    const idxLat = header.indexOf("latitude");
    const idxLon = header.indexOf("longitude");

    const dataLines = lines.slice(1);

    // Country ke hisaab se filter karo
    const filtered = dataLines.filter(line => {
      const cols = parseCSVLine(line);
      const cc = (cols[idxCountryCode] || "").toLowerCase();
      if (mode === "in") return cc === "in";
      if (mode === "us") return cc === "us";
      return cc !== "in" && cc !== "us"; // "other"
    });

    const totalRows = filtered.length;
    const cappedTotal = Math.min(totalRows, target);
    const batchLines = filtered.slice(offset, Math.min(offset + limit, cappedTotal));

    if (batchLines.length === 0) {
      return Response.json({ done: true, mode, totalAvailable: totalRows, target, message: "Target reached or no more rows." });
    }

    const rows = batchLines.map(line => {
      const cols = parseCSVLine(line);
      const name = cols[idxName];
      const country = cols[idxCountryCode];
      const lat = parseFloat(cols[idxLat]);
      const lon = parseFloat(cols[idxLon]);
      if (!name || !country || isNaN(lat) || isNaN(lon)) return null;
      return {
        name,
        country: country.toLowerCase(),
        lat,
        lon,
        slug: slugify(name, country)
      };
    }).filter(Boolean);

    const CHUNK = 20;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const batchStmts = chunk.map(r =>
        env.DB.prepare(
          `INSERT OR IGNORE INTO cities (city_name, city_slug, country_code, lat, lon) VALUES (?, ?, ?, ?, ?)`
        ).bind(r.name, r.slug, r.country, r.lat, r.lon)
      );
      await env.DB.batch(batchStmts);
      inserted += chunk.length;
    }

    const nextOffset = offset + limit;
    const done = nextOffset >= cappedTotal;

    return Response.json({
      done,
      mode,
      offset,
      inserted,
      target,
      totalAvailable: totalRows,
      nextOffset: done ? null : nextOffset,
      nextUrl: done ? null : `${url.origin}${url.pathname}?mode=${mode}&offset=${nextOffset}&limit=${limit}&key=${SECRET_KEY}`
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
