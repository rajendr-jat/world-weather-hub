const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const AQI_API = "https://air-quality-api.open-meteo.com/v1/air-quality";

function fetchWithTimeout(url, ms = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function resolveCurrentCity() {
    try {
        if (window.__PRELOADED_CITY__) {
            const preloaded = window.__PRELOADED_CITY__;
            try {
                localStorage.setItem('userCity', preloaded.name);
                localStorage.setItem('userLat', preloaded.lat);
                localStorage.setItem('userLon', preloaded.lon);
            } catch (storageErr) {
                console.warn('localStorage write failed, continuing without persistence:', storageErr);
            }
            return { lat: preloaded.lat, lon: preloaded.lon, name: preloaded.name };
        }

        const path = window.location.pathname;
        let slug = null;

        if (path.startsWith('/weather/')) {
            slug = path.split('/')[2];
        }

        if (slug) {
            try {
                const res = await fetchWithTimeout(`/api/city/${slug}`, 4000);
                if (res.ok) {
                    const cityData = await res.json();
                    const fullLocation = cityData.st
                        ? `${cityData.n}, ${cityData.st}, ${cityData.c}`
                        : `${cityData.n}, ${cityData.c}`;

                    try {
                        localStorage.setItem('userCity', fullLocation);
                        localStorage.setItem('userLat', cityData.lat);
                        localStorage.setItem('userLon', cityData.lon);
                    } catch (storageErr) {
                        console.warn('localStorage write failed, continuing without persistence:', storageErr);
                    }

                    return { lat: cityData.lat, lon: cityData.lon, name: fullLocation };
                }
            } catch (fetchErr) {
                console.warn('D1 city lookup failed, falling back to localStorage:', fetchErr);
            }
        }

        let savedLat, savedLon, savedCity;
        try {
            savedLat = localStorage.getItem('userLat');
            savedLon = localStorage.getItem('userLon');
            savedCity = localStorage.getItem('userCity');
        } catch (storageErr) {
            console.warn('localStorage read failed, using default city:', storageErr);
        }

        return {
            lat: savedLat ? parseFloat(savedLat) : 28.6139,
            lon: savedLon ? parseFloat(savedLon) : 77.2090,
            name: savedCity || "New Delhi, India"
        };
    } catch (err) {
        console.error('resolveCurrentCity failed, falling back to default city:', err);
        return { lat: 28.6139, lon: 77.2090, name: "New Delhi, India" };
    }
}

let ACTIVE_CITY = null;
let _activeCityPromise = null;

function ensureActiveCity() {
    if (!_activeCityPromise) {
        _activeCityPromise = resolveCurrentCity().then(city => {
            ACTIVE_CITY = city;
            window.ACTIVE_CITY = city;
            return city;
        });
    }
    return _activeCityPromise;
}

function getLat() { return ACTIVE_CITY ? ACTIVE_CITY.lat : 28.6139; }
function getLon() { return ACTIVE_CITY ? ACTIVE_CITY.lon : 77.2090; }

async function getWeatherData(lat = getLat(), lon = getLon()) {
    const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum&timezone=auto&forecast_days=16`;
    try {
        const response = await fetchWithTimeout(url, 6000);
        if (!response.ok) throw new Error("Network response was not ok");
        return await response.json();
    } catch (error) { return null; }
}

async function getAirQualityData(lat = getLat(), lon = getLon()) {
    const url = `${AQI_API}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi&timezone=auto&forecast_days=3`;
    try {
        const response = await fetchWithTimeout(url, 6000);
        if (!response.ok) throw new Error("Network response was not ok");
        return await response.json();
    } catch (error) { return null; }
}

function getWeatherIcon(code, isDay = 1) {
    if (code === 0) return isDay ? "fa-sun text-warning" : "fa-moon text-warning";
    if (code >= 1 && code <= 3) return isDay ? "fa-cloud-sun text-warning" : "fa-cloud-moon text-secondary";
    if (code >= 45 && code <= 48) return "fa-smog text-secondary";
    if (code >= 51 && code <= 67) return "fa-cloud-rain text-primary";
    if (code >= 71 && code <= 77) return "fa-snowflake text-info";
    if (code >= 80 && code <= 82) return "fa-cloud-showers-heavy text-primary";
    if (code >= 95) return "fa-cloud-bolt text-danger";
    return "fa-cloud text-secondary";
}

function getWeatherConditionText(code) {
    if (code === 0) return "Clear / Sunny";
    if (code >= 1 && code <= 3) return "Partly Cloudy";
    if (code >= 45 && code <= 48) return "Foggy";
    if (code >= 51 && code <= 67) return "Rainy";
    if (code >= 71 && code <= 77) return "Snowy";
    if (code >= 80 && code <= 82) return "Showers";
    if (code >= 95) return "Thunderstorm";
    return "Cloudy";
}

function getAqiStatus(aqi) {
    if (aqi <= 50) return { text: "Good", class: "good" };
    if (aqi <= 100) return { text: "Moderate", class: "moderate" };
    if (aqi <= 150) return { text: "Sensitive", class: "moderate" };
    return { text: "Unhealthy", class: "unhealthy" };
}

function getAqiColor(aqi) {
    if (aqi <= 50) return "#34a853";
    if (aqi <= 100) return "#fbbc04";
    if (aqi <= 150) return "#fa7b17";
    if (aqi <= 200) return "#ea4335";
    if (aqi <= 300) return "#a142f4";
    return "#800000";
}

function getWindDirection(degree) {
    if (degree === undefined || degree === null) return "";
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((degree %= 360) < 0 ? degree + 360 : degree) / 45) % 8;
    return directions[index];
}
