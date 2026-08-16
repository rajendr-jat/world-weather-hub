// functions/weather/[slug].js
// Route: /weather/<slug>/  ->  serves index.html but with a UNIQUE title & meta
// description for each city (pulled from D1), plus server-side pre-rendered
// weather data so Googlebot sees real content even without JS running.

class TitleRewriter {
  constructor(cityLabel) { this.cityLabel = cityLabel; }
  element(element) {
    // Suffix ~24 chars hai, isliye cityLabel ko max ~44 chars tak allow karte
    // hain taaki poora title 70 characters se kabhi na badhe (SEO best practice).
    const suffix = " Weather Today | AQI & Forecast";
    const maxCityLen = 70 - suffix.length;
    let label = this.cityLabel;
    if (label.length > maxCityLen) {
      label = label.slice(0, maxCityLen - 1).trim() + "…";
    }
    element.setInnerContent(`${label}${suffix}`);
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
    }
  }
}

class NearbyCitiesRewriter {
  constructor(html) { this.html = html; }
  element(element) {
    if (this.html) {
      element.setInnerContent(this.html, { html: true });
    }
  }
}

class CitySummaryRewriter {
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

// ============================================================
// AUTO-GENERATED CITY SUMMARY — SEO ke liye unique paragraph
// Har city page ke liye alag-alag sentence combinations chunta
// hai (temperature range, condition, wind, humidity, AQI ke
// aadhar par), taaki Google ko har page genuinely unique lage,
// sirf ek hi template repeat na ho.
// ============================================================

function pick(arr, seed) {
  // seed (jaise lat*lon ka hash) se deterministic-but-varied choice
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx];
}

function buildCitySummaryHtml(cityLabel, weatherCur, aqiVal, seed) {
  if (!weatherCur) return "";

  const temp = Math.round(weatherCur.temperature_2m);
  const feels = Math.round(weatherCur.apparent_temperature);
  const humidity = weatherCur.relative_humidity_2m;
  const wind = Math.round(weatherCur.wind_speed_10m);
  const conditionText = weatherConditionText(weatherCur.weather_code).toLowerCase();

  // Temperature ke hisaab se opening line ke alag-alag versions
  let tempOpeners;
  if (temp >= 35) {
    tempOpeners = [
      `${cityLabel} is experiencing intense heat today, with the mercury touching ${temp}°C.`,
      `It's a scorching day in ${cityLabel}, with temperatures reaching ${temp}°C.`,
      `Today's heat in ${cityLabel} is significant, hovering around ${temp}°C.`
    ];
  } else if (temp >= 25) {
    tempOpeners = [
      `${cityLabel} is seeing warm conditions today, with temperatures around ${temp}°C.`,
      `The weather in ${cityLabel} is pleasantly warm at ${temp}°C right now.`,
      `Today in ${cityLabel}, temperatures are sitting comfortably near ${temp}°C.`
    ];
  } else if (temp >= 15) {
    tempOpeners = [
      `${cityLabel} is enjoying mild weather today, with temperatures around ${temp}°C.`,
      `Conditions in ${cityLabel} are cool and comfortable, currently at ${temp}°C.`,
      `It's a mild day in ${cityLabel}, with the temperature reading ${temp}°C.`
    ];
  } else {
    tempOpeners = [
      `${cityLabel} is experiencing cold conditions today, with temperatures around ${temp}°C.`,
      `It's a chilly day in ${cityLabel}, with the mercury at just ${temp}°C.`,
      `Today's weather in ${cityLabel} is notably cold, sitting near ${temp}°C.`
    ];
  }

  // Feels-like difference ke hisaab se dusra sentence
  const feelsDiff = feels - temp;
  let feelsSentences;
  if (feelsDiff >= 5) {
    feelsSentences = [
      `Due to high humidity, it feels noticeably warmer at around ${feels}°C.`,
      `Humidity is making it feel closer to ${feels}°C than the actual reading.`,
      `The real-feel temperature is higher, at approximately ${feels}°C.`
    ];
  } else if (feelsDiff <= -3) {
    feelsSentences = [
      `Wind chill is bringing the felt temperature down to about ${feels}°C.`,
      `It feels slightly cooler than the actual reading, closer to ${feels}°C.`
    ];
  } else {
    feelsSentences = [
      `The apparent temperature closely matches the actual reading, at ${feels}°C.`,
      `It feels about as expected, close to ${feels}°C.`
    ];
  }

  // Condition + humidity + wind ko milakar teesra sentence
  let humidityDesc = humidity >= 70 ? "high humidity" : (humidity >= 40 ? "moderate humidity" : "low humidity");
  let windDesc = wind >= 25 ? "strong winds" : (wind >= 10 ? "a gentle breeze" : "calm air");

  const conditionSentences = [
    `Skies are ${conditionText} with ${humidityDesc} at ${humidity}% and ${windDesc} blowing at ${wind} km/h.`,
    `The sky remains ${conditionText}, humidity is at ${humidity}%, and wind speeds are around ${wind} km/h.`,
    `Expect ${conditionText} skies, with ${humidityDesc} (${humidity}%) and ${windDesc} (${wind} km/h).`
  ];

  // AQI wala sentence, agar available ho
  let aqiSentence = "";
  if (aqiVal !== null && aqiVal !== undefined) {
    if (aqiVal <= 50) {
      aqiSentence = `Air quality is good today (AQI ${aqiVal}), making it a favourable time for outdoor activities.`;
    } else if (aqiVal <= 100) {
      aqiSentence = `Air quality is moderate (AQI ${aqiVal}), generally acceptable for most people.`;
    } else if (aqiVal <= 150) {
      aqiSentence = `Air quality is at unhealthy levels for sensitive groups (AQI ${aqiVal}); those with respiratory conditions should take precautions.`;
    } else {
      aqiSentence = `Air quality is unhealthy today (AQI ${aqiVal}), and residents are advised to limit prolonged outdoor exposure.`;
    }
  }

  const opener = pick(tempOpeners, seed);
  const feelsLine = pick(feelsSentences, seed + 1);
  const conditionLine = pick(conditionSentences, seed + 2);

  return `
    <div class="premium-card" style="margin-bottom: 16px; padding: 16px;">
      <h3 class="section-title" style="font-size:15px; margin-bottom:10px;">
        <i class="fa-solid fa-align-left text-primary"></i> ${cityLabel} Weather Today
      </h3>
      <p style="font-size:13px; color:#3c4043; line-height:1.7; margin:0;">
        ${opener} ${feelsLine} ${conditionLine} ${aqiSentence}
      </p>
    </div>
  `;
}

async function fetchServerWeatherData(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m&daily=precipitation_probability_max&timezone=auto&forecast_days=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal, cf: { cacheTtl: 1800, cacheEverything: true } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.current) return null;
    return data;
  } catch (err) {
    return null;
  }
}

async function fetchServerAqi(lat, lon) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto&forecast_days=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { signal: controller.signal, cf: { cacheTtl: 1800, cacheEverything: true } });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.current ? data.current.us_aqi : null;
  } catch (err) {
    return null;
  }
}

function renderWeatherCardHtml(cityLabel, data) {
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

  // Weather aur AQI dono parallel mein fetch karte hain
  const [weatherData, aqiVal] = await Promise.all([
    fetchServerWeatherData(city.lat, city.lon),
    fetchServerAqi(city.lat, city.lon)
  ]);

  const weatherHtml = weatherData ? renderWeatherCardHtml(cityLabel, weatherData) : null;

  // Summary ke liye seed: lat/lon se ek deterministic number banate hain
  // taaki same city ko hamesha same-ish (par har city ko alag) template mile
  const seed = Math.abs((city.lat * 1000 + city.lon * 1000) | 0);
  const summaryHtml = weatherData
    ? buildCitySummaryHtml(cityLabel, weatherData.current, aqiVal, seed)
    : "";

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
    .on("#citySummarySection", new CitySummaryRewriter(summaryHtml))
    .on("#nearbyCitiesSection", new NearbyCitiesRewriter(nearbyHtml));

  return rewriter.transform(res);
    }
