card hourlyChartInstance = null;

async function initHome() {
    await ensureActiveCity();
    const card = document.getElementById('currentWeatherCard');
    const hourlySection = document.getElementById('hourlySection');
    const aqiSection = document.getElementById('compactAqiSection');
    const adviceSection = document.getElementById('smartAdviceSection');

    let cityName = "New Delhi, India";
    try {
        cityName = localStorage.getItem('userCity') || cityName;
    } catch (e) { /* localStorage blocked, use default */ }

    try {
        // Yahan hum Weather aur AQI dono ek sath fetch kar rahe hain
        const [data, aqiData] = await Promise.all([
            getWeatherData(),
            getAirQualityData()
        ]);

        renderHome(data, aqiData, cityName, card, hourlySection, aqiSection, adviceSection);
    } catch (err) {
        // Pehle yahan koi try/catch nahi tha. Agar upar wali koi bhi cheez fail
        // hoti (jaise ACTIVE_CITY resolve na hona, ya koi aur unexpected error),
        // to yeh function beech mein hi ruk jaata aur card ka HTML kabhi update
        // nahi hota — matlab "Loading local weather..." spinner hamesha ke liye
        // ghumta rehta. Ab error catch hoke user ko clear message dikhega.
        console.error('initHome failed:', err);
        if (card) {
            card.innerHTML = '<div style="padding: 20px; text-align: center;">Error loading weather data. Please refresh the page.</div>';
        }
    }
}

function renderHome(data, aqiData, cityName, card, hourlySection, aqiSection, adviceSection) {
    if(data && data.current) {
        const cur = data.current;
        const icon = getWeatherIcon(cur.weather_code, cur.is_day);
        const conditionText = getWeatherConditionText(cur.weather_code);
        const rainProb = data.daily.precipitation_probability_max[0] || 0;
        
        // 1. HERO SECTION GENERATION
        card.innerHTML = `
            <div class="weather-content" style="display: flex; justify-content: space-between; align-items: center;">
                <div class="hero-left">
                    <div class="location-info">
                        <span class="pin-icon">📍</span><h2>${cityName}</h2>
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

        // 2. HOURLY FORECAST
        hourlySection.style.display = 'block';
        setupHourlySection(data);

        // 3. COMPACT AQI CARD LOGIC
        if(aqiData && aqiData.current && aqiSection) {
            aqiSection.style.display = 'flex';
            const aqiVal = aqiData.current.us_aqi;
            const status = getAqiStatus(aqiVal);
            const colorHex = status.class === 'good' ? '#2e7d32' : (status.class === 'moderate' ? '#f57f17' : '#d32f2f');
            
            aqiSection.innerHTML = `
                <div class="c-aqi-left">
                    <div class="c-aqi-icon" style="background: ${colorHex}20; color: ${colorHex};">
                        <i class="fa-solid fa-leaf"></i>
                    </div>
                    <div class="c-aqi-text">
                        <h4>Air Quality</h4>
                        <p>Real-time US AQI</p>
                    </div>
                </div>
                <div class="c-aqi-right">
                    <span class="c-aqi-val" style="color: ${colorHex}">${aqiVal}</span>
                    <span class="aqi-status-badge ${status.class}">${status.text}</span>
                </div>
            `;
        }

        // 4. SMART HUB ADVICE LOGIC
        if (adviceSection) {
            adviceSection.style.display = 'block';
            generateSmartAdvice(data, aqiData);
        }
    } else {
        card.innerHTML = '<div style="padding: 20px; text-align: center;">Error loading data</div>';
    }
}

// Hourly Graph setup code
function setupHourlySection(data) {
    const hourly = data.hourly;
    const currentTime = data.current.time; 

    let daysMap = {};
    for(let i=0; i<hourly.time.length; i++) {
        const timeStr = hourly.time[i];
        const datePart = timeStr.split('T')[0];
        if(!daysMap[datePart]) daysMap[datePart] = [];
        daysMap[datePart].push({
            timeStr: timeStr, temp: Math.round(hourly.temperature_2m[i]), code: hourly.weather_code[i], rain: hourly.precipitation_probability[i] || 0
        });
    }
    
    const availableDates = Object.keys(daysMap).slice(0, 7);
    const tabsContainer = document.getElementById('hourlyTabs');
    tabsContainer.innerHTML = '';

    availableDates.forEach((dateKey, index) => {
        const dateObj = new Date(dateKey);
        let label = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        if (index === 0) label = "Today";
        if (index === 1) label = "Tomorrow";
        
        const btn = document.createElement('button');
        btn.className = `h-tab-btn ${index === 0 ? 'active' : ''}`;
        btn.innerText = label;
        
        btn.onclick = () => {
            document.querySelectorAll('.h-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderHourlyData(dateKey, index === 0, hourly, currentTime, daysMap);
        };
        tabsContainer.appendChild(btn);
    });

    if(availableDates.length > 0) renderHourlyData(availableDates[0], true, hourly, currentTime, daysMap);
}

function renderHourlyData(dateKey, isToday, fullHourlyData, currentTime, daysMap) {
    let displayData = [];
    if (isToday) {
        // API 'currentTime' टार्गेट सिटी के टाइमज़ोन में देता है (e.g., "2026-07-24T15:45")
        // इसे वर्तमान घंटे के शुरुआत (00 मिनट) पर सेट करें ताकि अभी का घंटा मिस न हो
        const currentHourIso = currentTime.substring(0, 13) + ":00";
        
        const startIndex = fullHourlyData.time.findIndex(t => t >= currentHourIso);
        if (startIndex !== -1) {
            for(let i = startIndex; i < startIndex + 24 && i < fullHourlyData.time.length; i++) {
                displayData.push({ 
                    timeStr: fullHourlyData.time[i], 
                    temp: Math.round(fullHourlyData.temperature_2m[i]), 
                    code: fullHourlyData.weather_code[i], 
                    rain: fullHourlyData.precipitation_probability[i] || 0 
                });
            }
        }
    } else {
        displayData = daysMap[dateKey];
    }

    const labels = displayData.map(d => {
        // API के स्ट्रिंग से डायरेक्ट hour निकालेंगे ताकि लोकल सिस्टम का टाइमज़ोन इफ़ेक्ट न करे
        const hour = parseInt(d.timeStr.substring(11, 13), 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h = hour % 12 || 12;
        
        // अगर यह बिल्कुल अभी का घंटा है, तो उसे "Now" दिखाएं
        if (isToday && d.timeStr === (currentTime.substring(0, 13) + ":00")) {
            return "Now";
        }
        
        return `${h} ${ampm}`;
    });

    const temps = displayData.map(d => d.temp);
    
    drawChart(labels, temps);
    
    const cardsContainer = document.getElementById('hourlyCardsRow');
    cardsContainer.innerHTML = displayData.map((d, index) => {
        const icon = getWeatherIcon(d.code);
        return `
            <div class="h-card">
                <span class="h-time">${labels[index]}</span>
                <i class="fa-solid ${icon} h-icon"></i>
                <span class="h-temp">${d.temp}°C</span>
                <span class="h-rain"><i class="fa-solid fa-droplet"></i> ${d.rain}%</span>
            </div>
        `;
    }).join('');
}

function drawChart(labels, dataPoints) {
    const ctx = document.getElementById('hourlyChartCanvas').getContext('2d');
    if(hourlyChartInstance) hourlyChartInstance.destroy();
    
    hourlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temp (°C)',
                data: dataPoints,
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#ffc107'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#9aa0a6', font: { size: 10 } } },
                y: { display: false, min: Math.min(...dataPoints) - 2, max: Math.max(...dataPoints) + 2 }
            }
        }
    });
}

// === SMART HUB ADVICE GENERATOR ===
function generateSmartAdvice(weatherData, aqiData) {
    const adviceList = document.getElementById('adviceList');
    const advices = [];
    
    const cur = weatherData.current;
    const daily = weatherData.daily;
    const aqi = aqiData && aqiData.current ? aqiData.current.us_aqi : 50;
    const rainProb = daily.precipitation_probability_max[0] || 0;

    // 1. Rain Advice
    if (rainProb > 40 || cur.precipitation > 0) {
        advices.push({ icon: 'fa-umbrella text-info', text: `Rain expected today (${rainProb}% chance). Don't forget to carry an umbrella!`, color: '#4fc3f7' });
    }
    // 2. Temperature Advice
    if (cur.temperature_2m >= 35) {
        advices.push({ icon: 'fa-temperature-arrow-up text-danger', text: "It's scorching hot outside! Stay hydrated and avoid direct sunlight.", color: '#ea4335' });
    } else if (cur.temperature_2m <= 15) {
        advices.push({ icon: 'fa-mitten text-info', text: "It's quite chilly today. Make sure to wear warm layers or a jacket.", color: '#4fc3f7' });
    } else {
        advices.push({ icon: 'fa-temperature-half text-warning', text: "The temperature is comfortable. Great time for outdoor activities!", color: '#fbbc04' });
    }
    // 3. AQI (Air Quality) Advice
    if (aqi > 100) {
        advices.push({ icon: 'fa-head-side-mask text-secondary', text: `Air quality is unhealthy (AQI ${aqi}). Consider wearing a mask if going outdoors.`, color: '#9aa0a6' });
    } else if (aqi <= 50) {
        advices.push({ icon: 'fa-leaf text-good', text: `Air quality is excellent (AQI ${aqi}). Breathe easy and open your windows.`, color: '#137333' });
    }
    // 4. UV Index Advice
    if (daily.uv_index_max[0] >= 6) {
        advices.push({ icon: 'fa-glasses text-warning', text: `High UV Index (${daily.uv_index_max[0]}). Apply sunscreen if you plan to stay in the sun.`, color: '#fbbc04' });
    }
    // 5. Wind Advice
    if (cur.wind_speed_10m > 25) {
        advices.push({ icon: 'fa-wind text-secondary', text: `It's quite windy (${Math.round(cur.wind_speed_10m)} km/h). Secure loose objects on your balcony.`, color: '#9aa0a6' });
    }
    // 6. General Weather Fallback (To make sure we always have ~5 advices)
    if (cur.cloud_cover > 80 && advices.length < 5) {
        advices.push({ icon: 'fa-cloud text-secondary', text: "It's mostly cloudy. Good weather for a cozy indoor day or reading a book.", color: '#9aa0a6' });
    }
    if (cur.weather_code === 0 && cur.is_day && advices.length < 5) {
        advices.push({ icon: 'fa-sun text-warning', text: "Beautiful clear skies! Make the most of this sunny day.", color: '#fbbc04' });
    }

    // Top 5 Advices Render Karein
    const finalAdvices = advices.slice(0, 5);
    adviceList.innerHTML = finalAdvices.map(item => `
        <li style="border-left-color: ${item.color}">
            <i class="fa-solid ${item.icon}" style="color: ${item.color};"></i>
            <span>${item.text}</span>
        </li>
    `).join('');
}

window.addEventListener('DOMContentLoaded', initHome);
