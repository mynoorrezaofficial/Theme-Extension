// State management
let state = {
    searchEngine: 'google',
    bgImage: 'assets/icon.png',
    themeMode: 'dark',
    accentColor: '#a0a0ff',
    opacity: 100,
    hideMic: false,
    hideEngines: false,
    hideClock: false,
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
    updateWeather();
    setupEventListeners();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.themeMode === 'system') applyState();
    });
});

function loadState() {
    chrome.storage.local.get(null, (result) => {
        for (let key in state) {
            if (result[key] !== undefined) state[key] = result[key];
        }
        applyState();
    });
}

function applyState() {
    // Background
    applyBackground(state.bgImage);
    
    // Theme logic
    let activeTheme = state.themeMode;
    if (activeTheme === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.body.className = activeTheme;
    
    // Accent logic
    document.documentElement.style.setProperty('--accent-color', state.accentColor);
    // Create a transparent version of accent color for glass effect
    const glassColor = state.accentColor.startsWith('#') ? state.accentColor + '33' : state.accentColor;
    document.documentElement.style.setProperty('--glass-accent-bg', glassColor);
    
    // Opacity
    const container = document.getElementById('main-container');
    const currentOpacity = Math.max(state.opacity || 100, 50);
    if (container) container.style.opacity = currentOpacity / 100;
    
    const slider = document.getElementById('opacity-slider');
    if (slider) slider.value = currentOpacity;
    
    const opacityVal = document.getElementById('opacity-val');
    if (opacityVal) opacityVal.textContent = `${currentOpacity}%`;

    // Toggles UI
    const updateToggle = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!val;
    };
    updateToggle('hide-mic-toggle', state.hideMic);
    updateToggle('hide-engines-toggle', state.hideEngines);
    updateToggle('hide-clock-toggle', state.hideClock);
    updateToggle('digital-clock-toggle', state.isDigital);
    updateToggle('12hr-toggle', state.is12hr);

    // Visibility
    const toggleClass = (selector, isHidden) => {
        const el = document.querySelector(selector);
        if (el) el.classList.toggle('hidden', !!isHidden);
    };
    
    toggleClass('.mic-icon', state.hideMic);
    toggleClass('.search-engines', state.hideEngines);
    toggleClass('#character-container', state.hideClock);
    
    const analog = document.getElementById('analog-clock');
    const digital = document.getElementById('digital-clock');
    if (analog && digital) {
        if (state.hideClock) {
            analog.classList.add('hidden');
            digital.classList.add('hidden');
        } else {
            analog.classList.toggle('hidden', !!state.isDigital);
            digital.classList.toggle('hidden', !state.isDigital);
        }
    }

    // Engine Selection
    setActiveEngine(state.searchEngine);
    
    // Settings UI highlights
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === state.themeMode);
    });
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.toggle('active', dot.dataset.color === state.accentColor);
    });
}

function saveState() {
    chrome.storage.local.set(state);
}

function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Analog
    const hourDeg = (hours % 12) * 30 + minutes * 0.5;
    const minDeg = minutes * 6;
    const hHand = document.querySelector('.hour-hand');
    const mHand = document.querySelector('.minute-hand');
    if (hHand) hHand.style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
    if (mHand) mHand.style.transform = `translateX(-50%) rotate(${minDeg}deg)`;

    // Digital
    const dTime = document.getElementById('digital-time');
    if (dTime) {
        let h = hours;
        let ampm = '';
        if (state.is12hr) {
            ampm = hours >= 12 ? ' PM' : ' AM';
            h = hours % 12 || 12;
        }
        dTime.textContent = `${h}:${minutes.toString().padStart(2, '0')}${ampm}`;
    }

    // Greeting & Date
    const greetingEl = document.getElementById('greeting');
    const dateEl = document.getElementById('date');
    if (greetingEl) {
        if (hours < 12) greetingEl.textContent = 'Good Morning';
        else if (hours < 18) greetingEl.textContent = 'Good Afternoon';
        else greetingEl.textContent = 'Good Evening';
    }
    if (dateEl) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
}

async function updateWeather() {
    try {
        const response = await fetch('https://wttr.in/?format=j1');
        const data = await response.json();
        const current = data.current_condition[0];
        
        const updateText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        updateText('temp', `${current.temp_C}°C`);
        updateText('weather-desc', current.weatherDesc[0].value);
        updateText('humidity', `${current.humidity}%`);
        updateText('feels-like', `Feels ${current.FeelsLikeC}°C`);
        updateText('location', data.nearest_area[0].areaName[0].value);
        
        const iconMap = { 'Clear': '☀️', 'Cloudy': '☁️', 'Partly cloudy': '⛅', 'Rain': '🌧️', 'Showers': '🌦️' };
        updateText('weather-icon-large', iconMap[current.weatherDesc[0].value] || '⛅');
    } catch (e) {
        console.error('Weather error:', e);
    }
}

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const doSearch = () => {
        if (searchInput && searchInput.value.trim()) {
            window.location.href = engines[state.searchEngine] + encodeURIComponent(searchInput.value.trim());
        }
    };
    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchInput) searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && doSearch());

    // Voice Search
    const micIcon = document.querySelector('.mic-icon');
    if (micIcon && ('webkitSpeechRecognition' in window)) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            micIcon.classList.add('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (searchInput) {
                searchInput.value = transcript;
                doSearch();
            }
        };

        recognition.onend = () => {
            micIcon.classList.remove('listening');
        };

        micIcon.addEventListener('click', () => {
            try {
                recognition.start();
            } catch (e) {
                console.error("Speech recognition error:", e);
            }
        });
    }

    // Settings
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    if (settingsBtn) settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    if (closeSettings) closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.add('hidden');
        });
    }

    // Accordions
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', () => {
            const panel = document.getElementById(header.dataset.target);
            const chevron = header.querySelector('.chevron');
            if (panel) {
                panel.classList.toggle('collapsed');
                if (chevron) chevron.textContent = panel.classList.contains('collapsed') ? '▼' : '▲';
            }
        });
    });

    // Theme Mode
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.themeMode = btn.dataset.mode;
            applyState();
            saveState();
        });
    });

    // Color Palette
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            state.accentColor = dot.dataset.color;
            applyState();
            saveState();
        });
    });

    // Opacity
    const slider = document.getElementById('opacity-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            state.opacity = e.target.value;
            applyState();
            saveState();
        });
    }

    // Toggles
    const setupToggle = (id, key) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                state[key] = e.target.checked;
                applyState();
                saveState();
            });
        }
    };
    setupToggle('hide-mic-toggle', 'hide-mic');
    setupToggle('hide-engines-toggle', 'hide-engines');
    setupToggle('hide-clock-toggle', 'hide-clock');
    setupToggle('digital-clock-toggle', 'isDigital');
    setupToggle('12hr-toggle', 'is12hr');

    // Wallpaper Presets Toggle
    const openPresetsBtn = document.getElementById('open-presets-btn');
    const presetsGrid = document.getElementById('presets-grid');
    if (openPresetsBtn && presetsGrid) {
        openPresetsBtn.addEventListener('click', () => {
            presetsGrid.classList.toggle('hidden');
        });
    }

    document.querySelectorAll('.preset-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
            state.bgImage = thumb.dataset.bg;
            applyBackground(state.bgImage);
            saveState();
            
            document.querySelectorAll('.preset-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    // Background Upload
    const bgInput = document.getElementById('bg-upload-input');
    if (bgInput) {
        bgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    state.bgImage = event.target.result;
                    applyBackground(state.bgImage);
                    saveState();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Engine Selection
    document.querySelectorAll('.engine-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            state.searchEngine = btn.dataset.engine;
            setActiveEngine(state.searchEngine);
            saveState();
        });
    });
}

function setActiveEngine(engine) {
    document.querySelectorAll('.engine-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.engine === engine);
    });
}

function applyBackground(bg) {
    if (bg) document.body.style.backgroundImage = `url('${bg}')`;
}
