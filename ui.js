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
