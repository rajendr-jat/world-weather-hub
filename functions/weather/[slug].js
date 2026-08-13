// functions/weather/[slug].js
// Route: /weather/<slug>/  ->  serves index.html but with a UNIQUE title & meta
// description for each city (pulled from D1), plus server-side pre-rendered
// weather data so Googlebot sees real content even without JS running.

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

function weatherIconClass(code, isDay = 1) {
  if (code === 0) return isDay ? "fa-sun" : "fa-moon";
  if (code >= 1 && code <= 3) return isDay ? "fa-cloud-sun" : "fa-cloud-moon";
  if (code >= 45 && code <= 48) return "fa-smog";
  if (code >= 51 && code <= 67) return "fa-cloud-rain";
  if (code >= 71 && code <= 77) return "fa-snowflake";
  if (code >= 80 && code <= 82) return "fa-cloud-showers-heavy";
  if (code >= 95) return "fa-cloud-bolt";
  return "fa-cloud";
}
function weatherConditionText(code) {
  if (code === 0) return "Clear / Sunny";
  if (code >= 1 && code <= 3) return "Partly Cloudy";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Rainy";
  if (code >= 71 && code <= 77) return "Snowy";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

class ServerWeatherCardRewriter {
  constructor(html) { this.html = html; }
  element(element) {
    if (this.html) {
      element.setInnerContent(this.html, { html: true });
    } else {
      element.setInnerContent(`<div style="padding: 20px; text-align: center;">Loading Weather...</div>`, { html: true });
    }
  }
}


// Naya: Nearby Cities section — same state/country ke 10 aur shehar ka
// server-side HTML banate hain, taaki har city page dusre city pages se
// link ho (internal linking web), aur Googlebot ko raw HTML mein hi
// yeh links mil jaayein.
class NearbyCitiesRewriter {
  constructor(html) { this.html = html; }
  element(element) {
    if (this.html) {
      element.setInnerContent(this.html, { html: true });
    }
  }
}

function buildNearbyCitiesHtml(cities, cityLabel, stateOrCountry) {
  if (!cities || cities.length === 0) return "";

  const links = cities.map(c => {
    const label = c.state ? `${c.city_name}, ${c.state}` : c.city_name;
    return `<a href="/weather/${c.city_slug}/" class="nearby-city-link">${label}</a>`;
  }).join("");

  return `
    <div class="premium-card" style="margin-bottom: 16px; padding: 16px;">
      <h3 class="section-title" style="font-size:15px; margin-bottom:10px;">
        <i class="fa-solid fa-location-dot text-primary"></i> Nearby Cities in ${stateOrCountry}
      </h3>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${links}
      </div>
    </div>
  `;
}

async function fetchServerWeatherHtml(cityLabel, lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal, cf: { cacheTtl: 1800, cacheEverything: true } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.current) return null;

    const cur = data.current;
    const rainProb = (data.daily && data.daily.precipitation_probability_max && data.daily.precipitation_probability_max[0]) || 0;
    const icon = weatherIconClass(cur.weather_code, cur.is_day);
    const conditionText = weatherConditionText(cur.weather_code);

    return `
      <div class="weather-content" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="hero-left">
          <div class="location-info">
            <span class="pin-icon">📍</span><h2>${cityLabel}</h2>
          </div>
          <div style="margin-top: 14px;">
            <div class="temp-display">
              <span class="temp-value">${Math.round(cur.temperature_2m)}</span>
              <span class="temp-unit">°C</span>
            </div>
            <p style="font-size: 14px; opacity: 0.95;">Feels like ${Math.round(cur.apparent_temperature)}°C</p>
          </div>
        </div>
        <div class="hero-right" style="text-align: center; display: flex; flex-direction: column; align-items: center;">
          <i class="fa-solid ${icon}" style="font-size: 50px; margin-bottom: 8px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));"></i>
          <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">${conditionText}</h3>
          <span style="background: rgba(255,255,255,0.25); backdrop-filter: blur(5px); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;">
            <i class="fa-solid fa-droplet text-info"></i> ${rainProb}% Rain
          </span>
        </div>
      </div>
      <div class="weather-stats-grid">
        <div class="stat-item"><i class="fa-solid fa-droplet"></i><span style="opacity:0.8">Humidity</span><b>${cur.relative_humidity_2m}%</b></div>
        <div class="stat-item"><i class="fa-solid fa-cloud"></i><span style="opacity:0.8">Clouds</span><b>${cur.cloud_cover}%</b></div>
        <div class="stat-item"><i class="fa-solid fa-wind"></i><span style="opacity:0.8">Wind</span><b>${Math.round(cur.wind_speed_10m)} km/h</b></div>
        <div class="stat-item"><i class="fa-solid fa-cloud-rain"></i><span style="opacity:0.8">Precip</span><b>${cur.precipitation} mm</b></div>
      </div>
    `;
  } catch (err) {
    return null;
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

  // Nearby cities: agar state maujood hai to usi state ke shehar,
  // warna usi country ke shehar. 10 random cities (khud ko chhodkar).
  let nearbyHtml = "";
  try {
    let nearbyResult;
    if (city.state) {
      nearbyResult = await env.DB.prepare(
        `SELECT city_name, city_slug, state FROM cities
         WHERE state = ? AND city_slug != ?
         ORDER BY RANDOM() LIMIT 10`
      ).bind(city.state, slug).all();
    } else {
      nearbyResult = await env.DB.prepare(
        `SELECT city_name, city_slug, state FROM cities
         WHERE country_code = ? AND city_slug != ?
         ORDER BY RANDOM() LIMIT 10`
      ).bind(city.country_code, slug).all();
    }
    const nearbyCities = nearbyResult && nearbyResult.results ? nearbyResult.results : [];
    const stateOrCountry = city.state || city.country_code.toUpperCase();
    nearbyHtml = buildNearbyCitiesHtml(nearbyCities, cityLabel, stateOrCountry);
  } catch (err) {
    nearbyHtml = "";
  }

  // Weather data ko city lookup ke saath hi parallel mein fetch kar lete hain
  const weatherHtml = await fetchServerWeatherHtml(cityLabel, city.lat, city.lon);

  const indexUrl = new URL("/", request.url);
  const res = await env.ASSETS.fetch(new Request(indexUrl, request));

  const rewriter = new HTMLRewriter()
    .on("title", new TitleRewriter(cityLabel))
    .on('meta[name="description"]', new MetaDescRewriter(cityLabel))
    .on("h1", new IntroParagraphRewriter(cityLabel))
    .on('link[rel="canonical"]', new CanonicalRewriter(slug))
    .on("head", new StructuredDataInjector(cityData, `https://world-weather-hub.pages.dev/weather/${slug}/`))
    .on("head", new PreloadedCityInjector(cityData, slug))
    .on("#currentWeatherCard", new ServerWeatherCardRewriter(weatherHtml))
    .on("#nearbyCitiesSection", new NearbyCitiesRewriter(nearbyHtml));

  return rewriter.transform(res);
}
