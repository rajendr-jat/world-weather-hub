let forecastChartInst = null;

async function initAqi() {
    await ensureActiveCity();
    const cityName = localStorage.getItem('userCity') || "New Delhi, India";
    const cityEl = document.getElementById('aqiCityName');
    if(cityEl) cityEl.innerText = cityName;
    
    const now = new Date();
    const updateEl = document.getElementById('aqiLastUpdated');
    if(updateEl) {
        updateEl.innerHTML = `<i class="fa-solid fa-rotate text-primary"></i> Last Updated: ${now.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}, ${now.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}`;
    }

    const lat = localStorage.getItem('userLat') ? parseFloat(localStorage.getItem('userLat')) : 28.6139;
    const lon = localStorage.getItem('userLon') ? parseFloat(localStorage.getItem('userLon')) : 77.2090;

    try {
        let data = null;
        try {
            data = await getAirQualityData(lat, lon);
        } catch(e) {
            console.warn("API fetch error, falling back");
        }

        if (!data || !data.current) {
            data = getFallbackAqiData(); 
        }

        const loader = document.getElementById('aqiLoader');
        if(loader) loader.style.display = 'none';
        
        const contentDiv = document.getElementById('aqiDashboardContent');
        if(contentDiv) contentDiv.style.display = 'block';

        const cur = data.current || {};
        const aqiVal = Math.round(cur.us_aqi !== undefined ? cur.us_aqi : 72);
        const status = getAqiStatus(aqiVal);
        const color = getAqiColor(aqiVal);

        const valEl = document.getElementById('mainAqiValue');
        if(valEl) {
            valEl.innerText = aqiVal;
            valEl.style.color = color;
        }

        const statusEl = document.getElementById('mainAqiStatus');
        if(statusEl) {
            statusEl.innerText = status.text;
            statusEl.style.color = color;
        }

        updateHealthGuidance(aqiVal);

        const maxAqi = 500;
        const percentage = Math.min(aqiVal / maxAqi, 1);
        const dashOffset = 125.66 - (125.66 * percentage);
        const gaugeFill = document.getElementById('gaugeFill');
        if(gaugeFill) {
            gaugeFill.style.strokeDashoffset = dashOffset;
            gaugeFill.setAttribute('stroke', color);
        }

        const pointer = document.getElementById('aqiPointer');
        if(pointer) {
            let pointerPercent = Math.min((aqiVal / 350) * 100, 98);
            if(pointerPercent < 2) pointerPercent = 2;
            pointer.style.left = `${pointerPercent}%`;
        }

        const pGrid = document.getElementById('pollutantGrid');
        if(pGrid) {
            const pm25Val = cur.pm2_5 !== undefined ? cur.pm2_5 : 7.3;
            const pm10Val = cur.pm10 !== undefined ? cur.pm10 : 7.8;
            const ozoneVal = cur.ozone !== undefined ? cur.ozone : 105;
            const no2Val = cur.nitrogen_dioxide !== undefined ? cur.nitrogen_dioxide : 4;
            const so2Val = cur.sulphur_dioxide !== undefined ? cur.sulphur_dioxide : 2.7;
            const coVal = cur.carbon_monoxide !== undefined ? cur.carbon_monoxide : 233;

            const pollutants = [
                { name: "PM2.5", val: pm25Val, unit: "µg/m³", desc: "Fine particulate matter (<2.5µm). Can penetrate deep into lungs.", s: getAqiStatus(pm25Val * 2) }, 
                { name: "PM10", val: pm10Val, unit: "µg/m³", desc: "Respirable particulate dust and smoke particles.", s: getAqiStatus(pm10Val / 2) },
                { name: "Ozone (O₃)", val: ozoneVal, unit: "µg/m³", desc: "Ground-level gas that can trigger respiratory issues.", s: getAqiStatus(ozoneVal) },
                { name: "NO₂", val: no2Val, unit: "µg/m³", desc: "Nitrogen dioxide from vehicle emissions and combustion.", s: getAqiStatus(no2Val * 5) },
                { name: "SO₂", val: so2Val, unit: "µg/m³", desc: "Sulphur dioxide resulting from industrial processes.", s: getAqiStatus(so2Val * 10) },
                { name: "CO", val: coVal, unit: "µg/m³", desc: "Carbon monoxide from incomplete fossil fuel combustion.", s: getAqiStatus(coVal / 2) }
            ];

            // Pollen (free Open-Meteo data) — shown only if available for this location
            if (cur.grass_pollen !== undefined && cur.grass_pollen !== null) {
                const pollenTypes = [
                    { name: "Grass Pollen", val: cur.grass_pollen, key: 'grass' },
                    { name: "Birch Pollen", val: cur.birch_pollen, key: 'birch' },
                    { name: "Ragweed Pollen", val: cur.ragweed_pollen, key: 'ragweed' }
                ];
                pollenTypes.forEach(pt => {
                    if (pt.val !== undefined && pt.val !== null) {
                        const lvl = getPollenLevel(pt.val);
                        pollutants.push({ name: pt.name, val: Math.round(pt.val), unit: "gr/m³", desc: "Airborne allergen concentration affecting seasonal allergy sufferers.", s: { text: lvl.text, class: lvl.text === 'Low' ? 'good' : (lvl.text === 'Moderate' ? 'moderate' : 'unhealthy') } });
                    }
                });
            }

            pGrid.innerHTML = pollutants.map(p => `
                <div class="pollutant-row">
                    <div class="pollutant-info">
                        <span style="font-weight:600; font-size:13px; color:#202124; display:block; margin-bottom:2px;">${p.name}</span>
                        <p style="font-size:11px; color:#5f6368; margin:0; line-height:1.3;">${p.desc}</p>
                    </div>
                    <div class="pollutant-metrics">
                        <span style="font-weight:bold; font-size:13px; color:#202124; display:block;">${p.val} <small style="font-size:10px; color:#5f6368; font-weight:normal;">${p.unit}</small></span>
                        <span style="font-size:10px; font-weight:600; padding:2px 6px; background:#fff; border-radius:4px; border:1px solid #dadce0; display:inline-block; margin-top:4px; color:${getAqiColor(p.s.class==='good'?20:80)}">${p.s.text}</span>
                    </div>
                </div>
            `).join('');
        }

        // Full 24-Hour Trend Data & Sliding Window Time Range Logic
        const allTimes = data.hourly && data.hourly.time ? data.hourly.time : [];
        const allAqi = data.hourly && data.hourly.us_aqi ? data.hourly.us_aqi : [];
        const currentTimeIso = cur.time || new Date().toISOString().split(':')[0] + ':00';

        let curIndex = allTimes.findIndex(t => t >= currentTimeIso);
        if(curIndex === -1) curIndex = 0;
        
        const forecastLabels = [];
        const forecastData = [];
        const rawTimes = [];
        
        for(let i = 0; i < 24; i++) {
            let targetIdx = curIndex + i;
            if(targetIdx >= allTimes.length) targetIdx = allTimes.length - 1;
            
            const timeStr = allTimes[targetIdx] || new Date().toISOString();
            const hr = new Date(timeStr).getHours();
            const formattedTime = `${hr%12||12} ${hr>=12?'PM':'AM'}`;
            const fcAqiVal = allAqi[targetIdx] !== undefined ? Math.round(allAqi[targetIdx]) : aqiVal;
            
            forecastLabels.push(formattedTime);
            forecastData.push(fcAqiVal);
            rawTimes.push(timeStr);
        }

        // 3-Hour window logic for exact ranges (e.g. 6:00 AM - 9:00 AM)
        let bestAvg = 999;
        let worstAvg = -1;
        let bestStartIdx = 0;
        let worstStartIdx = 0;
        const windowSize = 3; 

        for(let i = 0; i <= 24 - windowSize; i++) {
            let sum = 0;
            for(let j = 0; j < windowSize; j++) {
                sum += forecastData[i+j];
            }
            let avg = sum / windowSize;
            
            if(avg < bestAvg) { bestAvg = avg; bestStartIdx = i; }
            if(avg > worstAvg) { worstAvg = avg; worstStartIdx = i; }
        }

        function formatTimeWindow(startIdx) {
            let startHr = new Date(rawTimes[startIdx]).getHours();
            let endHr = new Date(rawTimes[startIdx + windowSize - 1]).getHours() + 1; // 3 ghante ka block
            
            const formatHr = (h) => `${(h%24)%12||12}:00 ${h%24>=12?'PM':'AM'}`;
            return `${formatHr(startHr)} – ${formatHr(endHr)}`;
        }

        const goodTimeStr = formatTimeWindow(bestStartIdx);
        const avoidTimeStr = formatTimeWindow(worstStartIdx);

        // Update New Design UI
        const goodEl = document.getElementById('goodTimeRange');
        const avoidEl = document.getElementById('avoidTimeRange');
        if(goodEl) goodEl.innerText = goodTimeStr;
        if(avoidEl) avoidEl.innerText = avoidTimeStr;

        drawForecastChart(forecastLabels, forecastData);

    } catch (error) {
        console.error("AQI Initialization Error:", error);
        const loader = document.getElementById('aqiLoader');
        if(loader) loader.style.display = 'none';
        const contentDiv = document.getElementById('aqiDashboardContent');
        if(contentDiv) {
            contentDiv.style.display = 'block';
            contentDiv.innerHTML = '<div style="text-align:center; padding: 40px; color: #ea4335;"><h2>Unable to load AQI data.</h2><p>Please check your connection and refresh.</p></div>';
        }
    }
}

function updateHealthGuidance(aqi) {
    let general = "Air quality is satisfactory, and air pollution poses little or no risk.";
    let sensitive = "Sensitive individuals can safely enjoy outdoor activities without restriction.";
    let activity = "Perfect conditions for outdoor exercise, sports, and ventilation.";
    let heroMsg = "Air quality is moderate. Acceptable for most, but monitor if sensitive.";

    if (aqi <= 50) {
        heroMsg = "Air quality is good and fresh. Ideal for all outdoor activities.";
    } else if (aqi > 50 && aqi <= 100) {
        general = "Air quality is acceptable; however, sensitive groups may experience minor irritation.";
        sensitive = "Children, elderly, and people with respiratory conditions should consider limiting prolonged outdoor exertion.";
        activity = "Outdoor activities are fine for most people, but listen to your body if you feel fatigued.";
        heroMsg = "Air quality is moderate. Acceptable for most, but monitor if sensitive.";
    } else if (aqi > 100 && aqi <= 150) {
        general = "Members of sensitive groups may experience health effects. The general public is less likely to be affected.";
        sensitive = "Sensitive groups should reduce outdoor exertion, keep windows closed, and wear masks if needed.";
        activity = "Consider shifting strenuous outdoor activities indoors or reducing intensity.";
        heroMsg = "Unhealthy for sensitive groups. Take basic precautions outdoors.";
    } else if (aqi > 150) {
        general = "Everyone may begin to experience health effects; members of sensitive groups may experience more serious effects.";
        sensitive = "Avoid outdoor physical activities and remain indoors with air purifiers active.";
        activity = "All strenuous outdoor workouts and sports should be strictly avoided or postponed.";
        heroMsg = "Unhealthy air quality. Limit prolonged outdoor exposure.";
    }

    document.getElementById('mainAqiMsg').innerText = heroMsg;
    document.getElementById('generalAdviceText').innerText = general;
    document.getElementById('sensitiveAdviceText').innerText = sensitive;
    document.getElementById('activityAdviceText').innerText = activity;
}

function getFallbackAqiData() {
    let dummyTimes = [];
    let dummyAqi = [];
    let d = new Date();
    d.setHours(0,0,0,0);
    for(let i=0; i<48; i++) {
        let currentD = new Date(d);
        currentD.setHours(d.getHours() + i);
        dummyTimes.push(currentD.toISOString());
        dummyAqi.push(Math.floor(Math.random() * 20) + 60); 
    }
    return {
        current: { us_aqi: 72, pm2_5: 7.3, pm10: 7.8, ozone: 105, nitrogen_dioxide: 4, sulphur_dioxide: 2.7, carbon_monoxide: 233, time: new Date().toISOString() },
        hourly: { time: dummyTimes, us_aqi: dummyAqi }
    };
}

function drawForecastChart(labels, dataPoints) {
    const ctxEl = document.getElementById('aqiForecastChart');
    if(!ctxEl) return;
    const ctx = ctxEl.getContext('2d');
    if(forecastChartInst) forecastChartInst.destroy();
    
    forecastChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'US AQI',
                data: dataPoints,
                borderColor: '#1a73e8',
                backgroundColor: 'rgba(26, 115, 232, 0.08)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#1a73e8'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { font: {size: 10} } },
                y: { grid: { color: '#f1f3f4' }, ticks: { font: {size: 10} } }
            }
        }
    });
}

window.addEventListener('DOMContentLoaded', initAqi);
