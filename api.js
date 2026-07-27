const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const AQI_API = "https://air-quality-api.open-meteo.com/v1/air-quality";
// URL se city identify karna
function resolveCurrentCity() {
    try {
        const path = window.location.pathname;

        // URL format: /weather/jaipur
        if (path.startsWith('/weather/')) {

            const slug = path.split('/')[2]
                ?.toLowerCase()
                .replace(/\/$/, '');

            if (slug && typeof CITIES_DATA !== 'undefined') {

                const cityData = CITIES_DATA.find(city => city.s === slug);

                if (cityData) {

                    const fullLocation = cityData.st
                        ? `${cityData.n}, ${cityData.st}, ${cityData.c}`
                        : `${cityData.n}, ${cityData.c}`;

                    return {
                        lat: cityData.lat,
                        lon: cityData.lon,
                        name: fullLocation,
                        slug: cityData.s
                    };
                }
            }
        }

        // Default city
        return {
            lat: 28.6139,
            lon: 77.2090,
            name: "New Delhi, Delhi, India",
            slug: "delhi"
        };

    } catch (error) {

        console.error("City resolve error:", error);

        return {
            lat: 28.6139,
            lon: 77.2090,
            name: "New Delhi, Delhi, India",
            slug: "delhi"
        };
    }
}

const ACTIVE_CITY = resolveCurrentCity();
// Location Functions
function getLat() { return ACTIVE_CITY.lat; }
function getLon() { return ACTIVE_CITY.lon; }

async function getWeatherData(lat = getLat(), lon = getLon()) {
    const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum&timezone=auto&forecast_days=16`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error("Network response was not ok");
        return await response.json();
    } catch (error) { return null; }
}

async function getAirQualityData(lat = getLat(), lon = getLon()) {
    const url = `${AQI_API}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi&timezone=auto&forecast_days=3`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
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
