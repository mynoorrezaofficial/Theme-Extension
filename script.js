// State management
let state = {
    searchEngine: 'google',
    bgImage: 'assets/icon.png',
    themeMode: 'dark',
    accentColor: '#f0932b',
    opacity: 100,
    weatherLocation: 'Dhaka',
    lat: 23.81,
    lon: 90.41,
    timezone: 'Asia/Dhaka',
    hideEngines: false,
    isDigital: false,
    is12hr: true
};

const engines = {
    google: 'https://www.google.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    brave: 'https://search.brave.com/search?q='
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateClock();
    setInterval(updateClock, 1000);
    setupEventListeners();
});

function loadState() {
    chrome.storage.local.get(null, (result) => {
        for (let key in state) {
            if (result[key] !== undefined) state[key] = result[key];
        }
        applyState();
        updateWeather();
    });
}

function applyState() {
    applyBackground(state.bgImage);
    document.body.className = state.themeMode === 'system' ? 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : state.themeMode;
    
    document.documentElement.style.setProperty('--accent-color', state.accentColor);
    const glassColor = state.accentColor.startsWith('#') ? state.accentColor + '33' : state.accentColor;
    document.documentElement.style.setProperty('--glass-accent-bg', glassColor);
    
    const container = document.getElementById('main-container');
    if (container) container.style.opacity = (state.opacity || 100) / 100;

    const locInput = document.getElementById('weather-location-input');
    if (locInput) locInput.value = state.weatherLocation;

    // Sync Toggles - only set value, don't trigger events
    const toggleSync = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!val;
    };
    toggleSync('hide-engines-toggle', state.hideEngines);
    toggleSync('digital-clock-toggle', state.isDigital);
    toggleSync('12hr-toggle', state.is12hr);

    // Visibility
    const engineSection = document.querySelector('.search-engines');
    if (engineSection) engineSection.style.display = state.hideEngines ? 'none' : 'flex';
    
    const analog = document.getElementById('analog-clock');
    const digital = document.getElementById('digital-clock');
    if (analog && digital) {
        analog.classList.toggle('hidden', !!state.isDigital);
        digital.classList.toggle('hidden', !state.isDigital);
    }

    setActiveEngine(state.searchEngine);
    
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === state.themeMode));
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.toggle('active', dot.dataset.color === state.accentColor));
}

function saveState() {
    chrome.storage.local.set(state);
}

function updateClock() {
    const now = new Date();
    const localizedDate = new Date(now.toLocaleString('en-US', { timeZone: state.timezone || 'Asia/Dhaka' }));
    const hours = localizedDate.getHours();
    const minutes = localizedDate.getMinutes();
    
    const hHand = document.querySelector('.hour-hand');
    const mHand = document.querySelector('.minute-hand');
    if (hHand) hHand.style.transform = `translateX(-50%) rotate(${(hours % 12) * 30 + minutes * 0.5}deg)`;
    if (mHand) mHand.style.transform = `translateX(-50%) rotate(${minutes * 6}deg)`;

    const dTime = document.getElementById('digital-time');
    if (dTime) {
        let h = state.is12hr ? (hours % 12 || 12) : hours;
        let ampm = state.is12hr ? (hours >= 12 ? ' PM' : ' AM') : '';
        dTime.textContent = `${h}:${minutes.toString().padStart(2, '0')}${ampm}`;
    }

    const dateEl = document.getElementById('date');
    if (dateEl) dateEl.textContent = localizedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: state.timezone });
}

async function updateWeather() {
    const lat = state.lat || 23.81;
    const lon = state.lon || 90.41;
    const timezone = state.timezone || "Asia/Dhaka";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=${encodeURIComponent(timezone)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const current = data.current;

        document.getElementById('temp').textContent = Math.round(current.temperature_2m) + "°C";
        document.getElementById('feels-like').textContent = "Feels " + Math.round(current.apparent_temperature) + "°C";
        document.getElementById('humidity').textContent = "Humidity " + current.relative_humidity_2m + "%";
        document.getElementById('humidity-icon').innerHTML = '<div class="drop" style="animation: none; transform: scale(1.5); opacity: 1;"></div>';
        document.getElementById('location').textContent = state.weatherLocation;

        const weatherMap = { 
            0: ['icon-clear', 'Clear sky'], 
            1: ['icon-mainly-clear', 'Mainly clear'], 
            2: ['icon-partly-cloudy', 'Partly cloudy'], 
            3: ['icon-overcast', 'Overcast'], 
            45: ['icon-fog', 'Fog'], 
            61: ['icon-rain', 'Rain'], 
            95: ['icon-storm', 'Storm'] 
        };
        const [iconClass, desc] = weatherMap[current.weather_code] || ['icon-partly-cloudy', 'Cloudy'];
        
        document.getElementById('weather-icon-large').innerHTML = getWeatherIconHTML(iconClass);
        document.getElementById('weather-desc').textContent = desc;
    } catch (error) {
        console.error("Weather error:", error);
    }
}

function getWeatherIconHTML(type) {
    const sun = '<div class="sun"></div>';
    const cloud = '<div class="cloud"></div>';
    const rain = '<div class="rain-drops"><div class="drop"></div><div class="drop"></div><div class="drop"></div></div>';
    const lightning = '<div class="lightning"></div>';
    const fog = '<div class="fog-lines"><div class="fog-line"></div><div class="fog-line"></div><div class="fog-line"></div></div>';

    let content = '';
    switch(type) {
        case 'icon-clear': content = sun; break;
        case 'icon-mainly-clear': content = sun + cloud; break;
        case 'icon-partly-cloudy': content = sun + cloud; break;
        case 'icon-overcast': content = cloud; break;
        case 'icon-fog': content = cloud + fog; break;
        case 'icon-rain': content = cloud + rain; break;
        case 'icon-storm': content = cloud + lightning; break;
        default: content = cloud;
    }
    return `<div class="weather-icon ${type}">${content}</div>`;
}

async function searchLocation(query) {
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const place = data.results[0];
            state.lat = place.latitude;
            state.lon = place.longitude;
            state.weatherLocation = place.name + (place.admin1 ? `, ${place.admin1}` : '');
            state.timezone = place.timezone; // This ensures the clock syncs to local time
            saveState();
            updateWeather();
            applyState();
        }
    } catch (e) {
        console.error("Location search error:", e);
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const doSearch = () => {
        if (searchInput && searchInput.value.trim()) {
            window.location.href = engines[state.searchEngine] + encodeURIComponent(searchInput.value.trim());
        }
    };
    document.getElementById('search-btn').addEventListener('click', doSearch);
    if (searchInput) searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && doSearch());

    const micIcon = document.querySelector('.mic-icon');
    if (micIcon && ('webkitSpeechRecognition' in window)) {
        const recognition = new webkitSpeechRecognition();
        recognition.onresult = (event) => { searchInput.value = event.results[0][0].transcript; doSearch(); };
        micIcon.addEventListener('click', () => recognition.start());
    }

    const settingsModal = document.getElementById('settings-modal');
    document.getElementById('settings-btn').addEventListener('click', () => settingsModal.classList.remove('hidden'));
    document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            const panel = document.getElementById(header.dataset.target);
            if (panel) panel.classList.toggle('collapsed');
        });
    });

    document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => { state.themeMode = btn.dataset.mode; applyState(); saveState(); }));
    document.querySelectorAll('.color-dot').forEach(dot => dot.addEventListener('click', () => { state.accentColor = dot.dataset.color; applyState(); saveState(); }));
    document.getElementById('opacity-slider').addEventListener('input', (e) => { state.opacity = e.target.value; applyState(); saveState(); });

    const locInput = document.getElementById('weather-location-input');
    const setLocBtn = document.getElementById('set-location-btn');
    if (setLocBtn) setLocBtn.addEventListener('click', () => searchLocation(locInput.value));
    if (locInput) locInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchLocation(locInput.value));

    // Toggles logic
    const setupToggle = (id, key) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                state[key] = e.target.checked;
                saveState();
                applyState();
            });
        }
    };
    setupToggle('hide-engines-toggle', 'hide-engines');
    setupToggle('digital-clock-toggle', 'isDigital');
    setupToggle('12hr-toggle', 'is12hr');

    document.getElementById('open-presets-btn').addEventListener('click', () => document.getElementById('presets-grid').classList.toggle('hidden'));
    document.querySelectorAll('.preset-thumb').forEach(thumb => thumb.addEventListener('click', () => {
        state.bgImage = thumb.dataset.bg; applyBackground(state.bgImage); saveState();
    }));

    document.getElementById('bg-upload-input').addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (event) => { state.bgImage = event.target.result; applyBackground(state.bgImage); saveState(); };
        reader.readAsDataURL(e.target.files[0]);
    });

    document.querySelectorAll('.engine-opt').forEach(btn => btn.addEventListener('click', () => { state.searchEngine = btn.dataset.engine; setActiveEngine(state.searchEngine); saveState(); }));
}

function setActiveEngine(engine) {
    document.querySelectorAll('.engine-opt').forEach(btn => btn.classList.toggle('active', btn.dataset.engine === engine));
}

function applyBackground(bg) {
    if (bg) document.body.style.backgroundImage = `url('${bg}')`;
}
