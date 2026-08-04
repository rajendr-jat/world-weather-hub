// functions/weather/[slug].js
// Route: /weather/<slug>/  ->  serves index.html but with a UNIQUE title & meta
// description for each city (pulled from D1), so Google sees different content
// on every city page instead of one generic template.

class TitleRewriter {
  constructor(cityLabel) { this.cityLabel = cityLabel; }
  element(element) {
    element.setInnerContent(`${this.cityLabel} Weather Today - Live Forecast & AQI | World Weather Hub`);
  }
}

class MetaDescRewriter {
  constructor(cityLabel) { this.cityLabel = cityLabel; }
  element(element) {
    element.setAttribute(
      "content",
      `Live weather conditions, hourly forecast, 16-day outlook and real-time AQI for ${this.cityLabel}. Accurate, up-to-date, and free.`
    );
  }
}

// Adds a small unique paragraph right after <h1> so the page isn't 100% identical HTML either
class IntroParagraphRewriter {
  constructor(cityLabel) { this.cityLabel = cityLabel; }
  element(element) {
    element.after(
      `<p style="max-width:900px;margin:4px auto 0;padding:0 10px;font-size:13px;color:#5f6368;">
        Get live weather updates for ${this.cityLabel}, including current temperature, humidity,
        wind speed, air quality index (AQI), and an extended 16-day forecast.
      </p>`,
      { html: true }
    );
  }
}

export async function onRequest(context) {
  const { env, params, request } = context;
  const slug = params.slug;

  // 1. Look up the city's display name from D1
  let cityLabel = "Local"; // fallback if not found
  try {
    const city = await env.DB.prepare(
      `SELECT city_name, state, country_code FROM cities WHERE city_slug = ?`
    ).bind(slug).first();
    if (city) {
      cityLabel = city.state
        ? `${city.city_name}, ${city.state}`
        : `${city.city_name}, ${city.country_code.toUpperCase()}`;
    }
  } catch (err) {
    // if lookup fails, just fall back to generic label, don't break the page
  }

  // 2. Fetch the normal index.html from static assets
  const indexUrl = new URL("/", request.url);
  const res = await env.ASSETS.fetch(new Request(indexUrl, request));

  // 3. Rewrite <title>, meta description, and inject a short intro paragraph
  const rewriter = new HTMLRewriter()
    .on("title", new TitleRewriter(cityLabel))
    .on('meta[name="description"]', new MetaDescRewriter(cityLabel))
    .on("h1", new IntroParagraphRewriter(cityLabel));

  return rewriter.transform(res);
}
