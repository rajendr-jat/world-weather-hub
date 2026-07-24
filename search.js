document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const suggestionsBox = document.getElementById("suggestionsBox");

    async function fetchCities(query) {
        if (query.length < 2) {
            suggestionsBox.style.display = "none";
            return;
        }
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`);
            const data = await res.json();
            
            if (data.results && data.results.length > 0) {
                suggestionsBox.innerHTML = "";
                data.results.forEach(city => {
                    const div = document.createElement("div");
                    div.className = "suggestion-item";
                    
                    const district = city.admin2 ? `, ${city.admin2}` : "";
                    const state = city.admin1 ? `, ${city.admin1}` : "";
                    const country = city.country ? `, ${city.country}` : "";
                    const fullLocationName = `${city.name}${district}${state}${country}`;
                    
                    div.innerHTML = `<i class="fa-solid fa-location-dot text-secondary" style="margin-right:8px;"></i> ${fullLocationName}`;
                    
                    div.addEventListener("click", () => {
                        suggestionsBox.style.display = "none";
                        searchInput.value = ""; 

                        const searchSlug = city.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        const isSupportedCity = typeof CITIES_DATA !== 'undefined' && CITIES_DATA.some(c => c.s === searchSlug);

                        if (isSupportedCity) {
                            // 200 शहरों में से है तो SEO URL पर भेजें
                            window.location.href = `/weather/${searchSlug}/`;
                        } else {
                            // कोई अन्य शहर है तो Home Page पर भेजें
                            localStorage.setItem('userCity', fullLocationName);
                            localStorage.setItem('userLat', city.latitude);
                            localStorage.setItem('userLon', city.longitude);
                            window.location.href = '/'; 
                        }
                    });
                    
                    suggestionsBox.appendChild(div);
                });
                suggestionsBox.style.display = "block";
            } else {
                suggestionsBox.style.display = "none";
            }
        } catch (error) {
            console.error("City Search Error:", error);
        }
    }

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fetchCities(e.target.value.trim()), 300);
        });
        document.addEventListener("click", (e) => {
            if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.style.display = "none";
            }
        });
    }

    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", () => {
            fetchCities(searchInput.value.trim());
        });
    }
});
