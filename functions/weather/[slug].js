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
class CanonicalRewriter {
  constructor(slug) { this.slug = slug; }
  element(element) {
    element.setAttribute("href", `https://world-weather-hub.pages.dev/weather/${this.slug}/`);
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

// Injects JSON-LD structured data (Place + BreadcrumbList) into <head>
class StructuredDataInjector {
  constructor(cityData, pageUrl) { this.cityData = cityData; this.pageUrl = pageUrl; }
  element(element) {
    const { name, state, country, lat, lon } = this.cityData;
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Place",
          "name": name,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": name,
            "addressRegion": state || undefined,
            "addressCountry": country
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": lat,
            "longitude": lon
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://world-weather-hub.pages.dev/" },
            { "@type": "ListItem", "position": 2, "name": name, "item": this.pageUrl }
          ]
        }
      ]
    };
    element.append(
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
      { html: true }
    );
  }
}

export async function onRequest(context) {
  const { env, params, request } = context;
  const slug = params.slug;

  // 1. Look up the city's display name from D1
  let cityLabel = "Local"; // fallback if not found
  let cityData = { name: "Local", state: null, country: "IN", lat: 0, lon: 0 };
  try {
    const city = await env.DB.prepare(
      `SELECT city_name, state, country_code, lat, lon FROM cities WHERE city_slug = ?`
    ).bind(slug).first();
    if (city) {
      cityLabel = city.state
        ? `${city.city_name}, ${city.state}`
        : `${city.city_name}, ${city.country_code.toUpperCase()}`;
      cityData = {
        name: city.city_name,
        state: city.state,
        country: city.country_code.toUpperCase(),
        lat: city.lat,
        lon: city.lon
      };
    }
  } catch (err) {
    // if lookup fails, just fall back to generic label, don't break the page
  }

  // 2. Fetch the normal index.html from static assets
  const indexUrl = new URL("/", request.url);
  const res = await env.ASSETS.fetch(new Request(indexUrl, request));

  // 3. Rewrite <title>, meta description, inject intro paragraph + structured data
  const rewriter = new HTMLRewriter()
    .on("title", new TitleRewriter(cityLabel))
    .on('meta[name="description"]', new MetaDescRewriter(cityLabel))
    .on("h1", new IntroParagraphRewriter(cityLabel))
    .on('link[rel="canonical"]', new CanonicalRewriter(slug));
    

  return rewriter.transform(res);
}
