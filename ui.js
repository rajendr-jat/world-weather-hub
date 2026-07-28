// ui.js - FAQ Accordion and UI Enhancements Handler

const faqData = [
    { q: "What is the difference between weather and climate?", a: "Weather describes short-term conditions of the atmosphere, while climate is the average of weather patterns over a long period." },
    { q: "How accurate are weather forecasts?", a: "Modern forecasts are highly accurate for the first 3-5 days, but accuracy gradually decreases beyond 10 days." },
    { q: "What does rain probability mean?", a: "It indicates the likelihood of measurable precipitation occurring within a specific area and timeframe." },
    { q: "What does humidity mean in weather?", a: "Humidity is the amount of water vapor in the air. High humidity limits sweat evaporation, making it feel hotter." },
    { q: "What is the UV Index?", a: "A scale measuring the strength of sunburn-producing ultraviolet radiation at a particular place and time." },
    { q: "What does AQI mean?", a: "Air Quality Index (AQI) measures how clean or polluted the air is, and what associated health effects might be a concern." },
    { q: "How is wind speed measured?", a: "Wind speed is traditionally measured using an instrument called an anemometer." },
    { q: "Why does the weather forecast change?", a: "The atmosphere is chaotic. As new, more accurate data is collected by satellites and stations, models update their predictions." },
    { q: "What is feels-like temperature?", a: "It calculates how hot or cold it actually feels to the human body when humidity and wind chill are factored in with the air temperature." },
    { q: "How do weather satellites help with forecasting?", a: "They track cloud formations, storm systems, temperature patterns, and atmospheric moisture from space in real-time." }
];

function initFAQ() {
    const container = document.getElementById('faqContainer');
    if (!container) return;
    
    let html = '';
    faqData.forEach((item, index) => {
        html += `
            <div class="faq-item">
                <button class="faq-question" onclick="toggleFaq(${index})">
                    <span>${item.q}</span>
                    <i class="fa-solid fa-chevron-down faq-icon" id="faq-icon-${index}"></i>
                </button>
                <div class="faq-answer" id="faq-ans-${index}">
                    <p>${item.a}</p>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function toggleFaq(index) {
    const ans = document.getElementById(`faq-ans-${index}`);
    const icon = document.getElementById(`faq-icon-${index}`);
    
    if (!ans || !icon) return;

    if (ans.classList.contains('active')) {
        ans.classList.remove('active');
        icon.style.transform = 'rotate(0deg)';
    } else {
        // Close other open FAQs
        document.querySelectorAll('.faq-answer.active').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.faq-icon').forEach(el => el.style.transform = 'rotate(0deg)');
        
        // Open the clicked FAQ
        ans.classList.add('active');
        icon.style.transform = 'rotate(180deg)';
    }
}

window.addEventListener('DOMContentLoaded', initFAQ);
function initMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const dropdown = document.getElementById('dropdownMenu');
    if (!menuBtn || !dropdown) return;
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== menuBtn) {
            dropdown.classList.remove('show');
        }
    });
}

function initLocationButton() {
    const locBtn = document.getElementById('locBtn');
    if (!locBtn) return;
    locBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        const icon = locBtn.querySelector('i');
        icon.className = 'fa-solid fa-spinner fa-spin';
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            let cityName = "My Location";
            try {
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
                const geo = await res.json();
                cityName = [geo.locality, geo.principalSubdivision, geo.countryName].filter(Boolean).join(', ') || cityName;
            } catch (e) { console.warn('Reverse geocoding failed:', e); }
            try {
                localStorage.setItem('userLat', lat);
                localStorage.setItem('userLon', lon);
                localStorage.setItem('userCity', cityName);
            } catch (e) { console.warn('localStorage write failed:', e); }
            window.location.href = '/';
        }, (error) => {
            icon.className = 'fa-solid fa-location-dot';
            alert("Unable to get your location. Please allow location access and try again.");
            console.error('Geolocation error:', error);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

window.addEventListener('DOMContentLoaded', initMenu);
window.addEventListener('DOMContentLoaded', initLocationButton);
