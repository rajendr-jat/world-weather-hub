async function initForecast() {
    const container = document.getElementById('sixteenDayList');
    const cityTitle = document.getElementById('forecastCityTitle');
    const loader = document.getElementById('forecastLoader');
    const contentDiv = document.getElementById('forecastDashboardContent');

    if (!container) return;

    if(cityTitle) cityTitle.innerText = localStorage.getItem('userCity') || "New Delhi, India";

    try {
        const data = await getWeatherData();

        if(loader) loader.style.display = 'none';
        if(contentDiv) contentDiv.style.display = 'block';

        if (data && data.daily && data.daily.time) {
            container.innerHTML = ''; 
            const daily = data.daily;

            for(let i = 0; i < daily.time.length; i++) {
                // Safe checks for missing array values
                if (daily.temperature_2m_max[i] === null) continue;

                const dateObj = new Date(daily.time[i]);
                let dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dayDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
                // The API's daily array is already ordered starting from "today" for the queried location (timezone=auto)
                if (i === 0) dayName = "Today";
                else if (i === 1) dayName = "Tomorrow";

                const iconClass = getWeatherIcon(daily.weather_code[i] || 0);
                const tMax = Math.round(daily.temperature_2m_max[i] || 0);
                const tMin = Math.round(daily.temperature_2m_min[i] || 0);
                const rainProb = (daily.precipitation_probability_max && daily.precipitation_probability_max[i]) ? daily.precipitation_probability_max[i] : 0;
                const rainSum = (daily.precipitation_sum && daily.precipitation_sum[i]) ? daily.precipitation_sum[i] : 0;
                const windSpeed = Math.round((daily.wind_speed_10m_max && daily.wind_speed_10m_max[i]) ? daily.wind_speed_10m_max[i] : 0);
                const windDirDeg = (daily.wind_direction_10m_dominant && daily.wind_direction_10m_dominant[i]) ? daily.wind_direction_10m_dominant[i] : 0;
                const windDirTxt = getWindDirection(windDirDeg); 
                const uvIndex = (daily.uv_index_max && daily.uv_index_max[i]) ? daily.uv_index_max[i] : 0;
                const radiation = (daily.shortwave_radiation_sum && daily.shortwave_radiation_sum[i]) ? daily.shortwave_radiation_sum[i] : 0;
                
                const sunriseRaw = (daily.sunrise && daily.sunrise[i]) ? daily.sunrise[i] : null;
                const sunsetRaw = (daily.sunset && daily.sunset[i]) ? daily.sunset[i] : null;
                const sunrise = sunriseRaw ? new Date(sunriseRaw).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "--";
                const sunset = sunsetRaw ? new Date(sunsetRaw).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "--";

                container.insertAdjacentHTML('beforeend', `
                    <div class="daily-card">
                        <div class="daily-summary" onclick="this.parentElement.classList.toggle('active')">
                            <div class="day-col">
                                <span class="day-name">${dayName}</span>
                                <span class="day-date">${dayDate}</span>
                            </div>
                            <div class="icon-col">
                                <i class="fa-solid ${iconClass}"></i>
                            </div>
                            <div class="conditions-col">
                                <span><i class="fa-solid fa-droplet text-info"></i> ${rainProb}%</span>
                                <span><i class="fa-solid fa-wind text-secondary"></i> ${windSpeed} km/h ${windDirTxt}</span>
                            </div>
                            <div class="temp-col">
                                <span class="t-max">${tMax}°</span>
                                <span class="t-min">${tMin}°</span>
                            </div>
                            <div class="arrow-col"><i class="fa-solid fa-chevron-down expand-icon"></i></div>
                        </div>
                        <div class="daily-details">
                            <div class="details-grid">
                                <div class="d-item"><i class="fa-solid fa-sun text-warning"></i><div class="d-info"><span>UV Index</span><b>${uvIndex}</b></div></div>
                                <div class="d-item"><i class="fa-solid fa-cloud-rain text-primary"></i><div class="d-info"><span>Rain Sum</span><b>${rainSum} mm</b></div></div>
                                <div class="d-item"><i class="fa-solid fa-compass text-secondary"></i><div class="d-info"><span>Wind</span><b>${windSpeed} km/h, ${windDirDeg}°</b></div></div>
                                <div class="d-item"><i class="fa-solid fa-temperature-arrow-up text-danger"></i><div class="d-info"><span>Radiation</span><b>${radiation} MJ/m²</b></div></div>
                                <div class="d-item"><i class="fa-solid fa-sunrise text-warning"></i><div class="d-info"><span>Sunrise</span><b>${sunrise}</b></div></div>
                                <div class="d-item"><i class="fa-solid fa-sunset text-warning"></i><div class="d-info"><span>Sunset</span><b>${sunset}</b></div></div>
                            </div>
                        </div>
                    </div>
                `);
            }
        } else {
            container.innerHTML = '<div style="text-align:center; padding: 20px; color: #ea4335;">Failed to load forecast data from API. Please try again later.</div>';
        }
    } catch (error) {
        console.error("Rendering Error: ", error);
        if(loader) loader.style.display = 'none';
        if(contentDiv) contentDiv.style.display = 'block';
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #ea4335;">App Error: Failed to render data. Check internet connection.</div>';
    }
}
window.addEventListener('DOMContentLoaded', initForecast);
