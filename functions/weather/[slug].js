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

// Naya: city ka lat/lon/name page ke HTML mein pehle se hi daal dete hain,
// taaki JS ko dobara /api/city/[slug] call na karni pade — isse ek poori
// network request kam ho jaati hai, aur Googlebot ke limited crawl-time
// budget mein weather data render hone ke chances badh jaate hain.
class PreloadedCityInjector {
  constructor(cityData, slug) { this.cityData = cityData; this.slug = slug; }
  element(element) {
    const payload = {
      lat: this.cityData.lat,
      lon: this.cityData.lon,
      name: this.cityData.state
        ? `${this.cityData.name}, ${this.cityData.state}, ${this.cityData.country}`
        : `${this.cityData.name}, ${this.cityData.country}`,
      slug: this.slug
    };
    element.append(
      `<script>window.__PRELOADED_CITY__ = ${JSON.stringify(payload)};</script>`,
      { html: true }
    );
  }
}

export async function onRequest(context) {
  const { env, params, request } = context;
  const slug = params.slug;

  let city;
  try {
    city = await env.DB.prepare(
      `SELECT city_name, state, country_code, lat, lon FROM cities WHERE city_slug = ?`
    ).bind(slug).first();
  } catch (err) {
    return new Response("Internal error looking up city", { status: 500 });
  }

  if (!city) {
    return new Response("City not found", { status: 404 });
  }

  const cityLabel = city.state
    ? `${city.city_name}, ${city.state}`
    : `${city.city_name}, ${city.country_code.toUpperCase()}`;
  const cityData = {
    name: city.city_name,
    state: city.state,
    country: city.country_code.toUpperCase(),
    lat: city.lat,
    lon: city.lon
  };

  // Fetch the normal index.html from static assets
  const indexUrl = new URL("/", request.url);
  const res = await env.ASSETS.fetch(new Request(indexUrl, request));

  // Rewrite <title>, meta description, inject intro paragraph + structured data + preloaded city data
  const rewriter = new HTMLRewriter()
    .on("title", new TitleRewriter(cityLabel))
    .on('meta[name="description"]', new MetaDescRewriter(cityLabel))
    .on("h1", new IntroParagraphRewriter(cityLabel))
    .on('link[rel="canonical"]', new CanonicalRewriter(slug))
    .on("head", new StructuredDataInjector(cityData, `https://world-weather-hub.pages.dev/weather/${slug}/`))
    .on("head", new PreloadedCityInjector(cityData, slug));

  return rewriter.transform(res);
}
