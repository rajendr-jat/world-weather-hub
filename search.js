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
            let combinedResults = [];
            const queryLower = query.toLowerCase();

            // 1. Sabse pehle local 'cities.js' (CITIES_DATA) mein search karein
            if (typeof CITIES_DATA !== 'undefined') {
                const localMatches = CITIES_DATA.filter(c => 
                    c.n.toLowerCase().startsWith(queryLower) || 
                    c.n.toLowerCase().includes(queryLower)
                );
                
                // Unko result list me add karein
                localMatches.slice(0, 5).forEach(city => {
                    combinedResults.push({
                        name: city.n,
                        admin1: city.st,
                        country: city.c,
                        latitude: city.lat,
                        longitude: city.lon,
                        slug: city.s,
                        isLocal: true // Ye batane ke liye ki ye humari custom list se hai
                    });
                });
            }

            // 2. External API (Open-Meteo) se baaki duniya ki cities layein
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`);
            const data = await res.json();
            
            if (data.results) {
                data.results.forEach(apiCity => {
                    // Check karein ki ye city pehle se local list se to add nahi ho gayi
                    const isDuplicate = combinedResults.some(c => 
                        c.name.toLowerCase() === apiCity.name.toLowerCase() && 
                        c.country === apiCity.country
                    );
                    
                    if (!isDuplicate) {
                        combinedResults.push({
                            name: apiCity.name,
                            admin1: apiCity.admin1,
                            admin2: apiCity.admin2,
                            country: apiCity.country,
                            latitude: apiCity.latitude,
                            longitude: apiCity.longitude,
                            isLocal: false
                        });
                    }
                });
            }

            // Sirf top 6 results dikhayein
            combinedResults = combinedResults.slice(0, 6);

            if (combinedResults.length > 0) {
                suggestionsBox.innerHTML = "";
                
                combinedResults.forEach(city => {
                    const div = document.createElement("div");
                    div.className = "suggestion-item";

                    // Location ka text banana (jaise: Jaipur, Rajasthan, India)
                    let locationParts = [city.name];
                    if (city.admin2 && !city.isLocal) locationParts.push(city.admin2);
                    if (city.admin1) locationParts.push(city.admin1);
                    if (city.country) locationParts.push(city.country);
                    
                    const fullLocationName = locationParts.join(", ");

                    div.innerHTML = `<i class="fa-solid fa-location-dot text-secondary" style="margin-right:8px;"></i> ${fullLocationName}`;

                    // Jab user kisi city par click kare
                    div.addEventListener("click", () => {
                        suggestionsBox.style.display = "none";
                        searchInput.value = "";

                        // Spck Editor Fix: Sabhi cities ka data LocalStorage me set karein
                        try {
                            localStorage.setItem('userCity', fullLocationName);
                            localStorage.setItem('userLat', city.latitude);
                            localStorage.setItem('userLon', city.longitude);
                        } catch (storageErr) {
                            console.warn('localStorage write failed:', storageErr);
                        }

                        // Hamesha home page par data load karein taaki 404 error na aaye
                        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                            window.location.reload();
                        } else {
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

        // Bahar click karne par suggestion box band ho jaye
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
