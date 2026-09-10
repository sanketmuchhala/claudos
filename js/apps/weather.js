/* ===== WEATHER =====
   Live forecasts from Open-Meteo (free, no key; requested only when Weather
   or its widget is used). Search to add cities. Without a connection it
   shows sample data and labels it as such. */
(function () {
  const OS = window.OS;
  const { esc } = OS.util;
  const DEFAULT_CITIES = [
    { name: 'San Francisco', region: 'California', lat: 37.7749, lon: -122.4194 },
    { name: 'Bloomington', region: 'Indiana', lat: 39.1653, lon: -86.5264 },
    { name: 'New York', region: 'New York', lat: 40.7128, lon: -74.006 },
  ];
  const CODES = {
    0: ['Clear', '☀️', '🌙'], 1: ['Mostly Clear', '🌤️', '🌙'], 2: ['Partly Cloudy', '⛅', '☁️'], 3: ['Cloudy', '☁️', '☁️'],
    45: ['Fog', '🌫️', '🌫️'], 48: ['Freezing Fog', '🌫️', '🌫️'], 51: ['Light Drizzle', '🌦️', '🌧️'], 53: ['Drizzle', '🌦️', '🌧️'], 55: ['Heavy Drizzle', '🌧️', '🌧️'],
    56: ['Freezing Drizzle', '🌧️', '🌧️'], 57: ['Freezing Drizzle', '🌧️', '🌧️'], 61: ['Light Rain', '🌦️', '🌧️'], 63: ['Rain', '🌧️', '🌧️'], 65: ['Heavy Rain', '🌧️', '🌧️'],
    66: ['Freezing Rain', '🌧️', '🌧️'], 67: ['Freezing Rain', '🌧️', '🌧️'], 71: ['Light Snow', '🌨️', '🌨️'], 73: ['Snow', '🌨️', '🌨️'], 75: ['Heavy Snow', '❄️', '❄️'], 77: ['Snow Grains', '🌨️', '🌨️'],
    80: ['Showers', '🌦️', '🌧️'], 81: ['Showers', '🌧️', '🌧️'], 82: ['Heavy Showers', '⛈️', '⛈️'], 85: ['Snow Showers', '🌨️', '🌨️'], 86: ['Snow Showers', '❄️', '❄️'],
    95: ['Thunderstorms', '⛈️', '⛈️'], 96: ['Thunderstorms', '⛈️', '⛈️'], 99: ['Thunderstorms', '⛈️', '⛈️'],
  };
  const condition = (code, day = 1) => { const c = CODES[code] || CODES[2]; return { text: c[0], icon: day ? c[1] : c[2] }; };
  const cache = new Map();
  let win = null;
  const stored = CloudStorage.get('weather', { cities: null, selected: 0 });
  let cities = Array.isArray(stored.cities) && stored.cities.length ? stored.cities : DEFAULT_CITIES;
  let selected = Math.min(stored.selected || 0, cities.length - 1);

  const persist = () => CloudStorage.set('weather', { cities, selected });
  const keyOf = city => `${city.lat.toFixed(3)},${city.lon.toFixed(3)}`;

  function sample(city) {
    const seed = Math.abs(Math.round(city.lat * 7 + city.lon * 3));
    const base = 58 + (seed % 22);
    const codes = [0, 1, 2, 3, 61, 2, 0, 1, 80, 2];
    const now = new Date();
    return {
      demo: true,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      current: { temp: base + 3, feels: base + 1, humidity: 45 + (seed % 30), wind: 6 + (seed % 9), code: 2, isDay: now.getHours() > 6 && now.getHours() < 19 ? 1 : 0, pressure: 30.1 },
      hourly: Array.from({ length: 24 }, (_, i) => ({ hour: (now.getHours() + i) % 24, temp: base + Math.round(5 * Math.sin((now.getHours() + i - 9) / 24 * Math.PI * 2)), code: codes[(i + seed) % codes.length], isDay: ((now.getHours() + i) % 24) > 6 && ((now.getHours() + i) % 24) < 19 ? 1 : 0 })),
      daily: Array.from({ length: 10 }, (_, i) => ({ date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), max: base + 6 + ((seed + i * 3) % 7), min: base - 8 + ((seed + i * 5) % 6), code: codes[(i + seed) % codes.length], uv: 3 + ((seed + i) % 6), sunrise: '6:42 AM', sunset: '7:18 PM' })),
    };
  }

  async function fetchCity(city) {
    const key = keyOf(city);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 10 * 60e3) return hit.data;
    if (!navigator.onLine) return sample(city);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,pressure_msl&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=10`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      const nowIndex = Math.max(0, raw.hourly.time.findIndex(t => t >= raw.current.time.slice(0, 13)));
      const fmtTime = iso => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const data = {
        demo: false,
        timezone: raw.timezone,
        current: { temp: Math.round(raw.current.temperature_2m), feels: Math.round(raw.current.apparent_temperature), humidity: raw.current.relative_humidity_2m, wind: Math.round(raw.current.wind_speed_10m), code: raw.current.weather_code, isDay: raw.current.is_day, pressure: (raw.current.pressure_msl * 0.02953).toFixed(2) },
        hourly: raw.hourly.time.slice(nowIndex, nowIndex + 24).map((t, i) => ({ hour: Number(t.slice(11, 13)), temp: Math.round(raw.hourly.temperature_2m[nowIndex + i]), code: raw.hourly.weather_code[nowIndex + i], isDay: raw.hourly.is_day[nowIndex + i] })),
        daily: raw.daily.time.map((t, i) => ({ date: new Date(`${t}T12:00`), max: Math.round(raw.daily.temperature_2m_max[i]), min: Math.round(raw.daily.temperature_2m_min[i]), code: raw.daily.weather_code[i], uv: Math.round(raw.daily.uv_index_max[i] ?? 0), sunrise: fmtTime(raw.daily.sunrise[i]), sunset: fmtTime(raw.daily.sunset[i]) })),
      };
      cache.set(key, { at: Date.now(), data });
      return data;
    } catch (error) {
      console.warn('Weather: using sample data', error);
      return sample(city);
    }
  }

  const localTime = tz => { try { return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }); } catch { return ''; } };
  function sky(data) {
    const c = data.current;
    if (!c.isDay) return 'linear-gradient(180deg, #0b1a3a 0%, #1c2f5e 55%, #2d3f6b 100%)';
    if ([61, 63, 65, 80, 81, 82, 95, 96, 99, 51, 53, 55].includes(c.code)) return 'linear-gradient(180deg, #4b5d73 0%, #6c7d91 60%, #8796a8 100%)';
    if ([3, 45, 48].includes(c.code)) return 'linear-gradient(180deg, #6b7f99 0%, #8a9bb2 60%, #a6b3c4 100%)';
    return 'linear-gradient(180deg, #2f7fd6 0%, #58a3ea 55%, #86c1f2 100%)';
  }

  async function renderSidebar() {
    const list = win.body.querySelector('[data-cities]');
    list.innerHTML = cities.map((city, i) => `<button type="button" class="wx-city${i === selected ? ' is-selected' : ''}" data-city="${i}"><span><strong>${esc(city.name)}</strong><small data-city-time="${i}"></small><em data-city-cond="${i}"></em></span><span class="wx-city-temp" data-city-temp="${i}">--°</span></button>`).join('');
    cities.forEach(async (city, i) => {
      const data = await fetchCity(city);
      if (!win) return;
      const c = condition(data.current.code, data.current.isDay);
      const q = s => win.body.querySelector(s);
      q(`[data-city-time="${i}"]`) && (q(`[data-city-time="${i}"]`).textContent = localTime(data.timezone));
      q(`[data-city-cond="${i}"]`) && (q(`[data-city-cond="${i}"]`).textContent = `${c.text} · H:${data.daily[0].max}° L:${data.daily[0].min}°`);
      q(`[data-city-temp="${i}"]`) && (q(`[data-city-temp="${i}"]`).textContent = `${data.current.temp}°`);
      const button = q(`[data-city="${i}"]`);
      if (button) button.style.background = i === selected ? '' : sky(data);
    });
  }

  async function renderMain() {
    const city = cities[selected];
    const main = win.body.querySelector('[data-main]');
    main.classList.add('is-loading');
    const data = await fetchCity(city);
    if (!win || cities[selected] !== city) return;
    main.classList.remove('is-loading');
    const c = condition(data.current.code, data.current.isDay);
    const lows = Math.min(...data.daily.map(d => d.min));
    const highs = Math.max(...data.daily.map(d => d.max));
    const span = Math.max(1, highs - lows);
    const today = data.daily[0];
    main.style.background = sky(data);
    main.innerHTML = `<div class="wx-hero"><h2>${esc(city.name)}</h2><p class="wx-temp">${data.current.temp}°</p><p class="wx-cond">${esc(c.text)}</p><p class="wx-hl">H:${today.max}°  L:${today.min}°</p>${data.demo ? '<p class="wx-demo">Offline · sample data</p>' : ''}</div>
      <section class="wx-card wx-hourly"><header>HOURLY FORECAST</header><div class="wx-hours">${data.hourly.map((h, i) => { const hc = condition(h.code, h.isDay); return `<div class="wx-hour"><span>${i === 0 ? 'Now' : `${h.hour % 12 || 12}${h.hour < 12 ? 'AM' : 'PM'}`}</span><b aria-hidden="true">${hc.icon}</b><span>${h.temp}°</span></div>`; }).join('')}</div></section>
      <div class="wx-grid">
        <section class="wx-card wx-daily"><header>10-DAY FORECAST</header>${data.daily.map((d, i) => { const dc = condition(d.code, 1); return `<div class="wx-day"><span class="wx-dname">${i === 0 ? 'Today' : d.date.toLocaleDateString('en-US', { weekday: 'short' })}</span><b aria-hidden="true">${dc.icon}</b><span class="wx-lo">${d.min}°</span><span class="wx-range"><i style="left:${((d.min - lows) / span) * 100}%;right:${100 - ((d.max - lows) / span) * 100}%"></i></span><span>${d.max}°</span></div>`; }).join('')}</section>
        <section class="wx-card wx-tile"><header>FEELS LIKE</header><p class="wx-big">${data.current.feels}°</p><small>${data.current.feels < data.current.temp ? 'Wind is making it feel cooler.' : 'Similar to the actual temperature.'}</small></section>
        <section class="wx-card wx-tile"><header>HUMIDITY</header><p class="wx-big">${data.current.humidity}%</p></section>
        <section class="wx-card wx-tile"><header>WIND</header><p class="wx-big">${data.current.wind} <small>mph</small></p></section>
        <section class="wx-card wx-tile"><header>UV INDEX</header><p class="wx-big">${today.uv}</p><small>${today.uv <= 2 ? 'Low' : today.uv <= 5 ? 'Moderate' : today.uv <= 7 ? 'High' : 'Very High'}</small></section>
        <section class="wx-card wx-tile"><header>SUNRISE</header><p class="wx-big">${esc(today.sunrise)}</p><small>Sunset: ${esc(today.sunset)}</small></section>
        <section class="wx-card wx-tile"><header>PRESSURE</header><p class="wx-big">${esc(String(data.current.pressure))} <small>inHg</small></p></section>
      </div>
      <p class="wx-credit">${data.demo ? 'Sample data shown while offline.' : 'Weather data by Open-Meteo.com'}</p>`;
    win.setTitle(`Weather — ${city.name}`);
  }

  async function searchCities(query) {
    const box = win.body.querySelector('[data-results]');
    if (query.trim().length < 2) { box.hidden = true; return; }
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`);
      const data = await response.json();
      const results = (data.results || []).map(r => ({ name: r.name, region: [r.admin1, r.country].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude }));
      box.hidden = false;
      box.innerHTML = results.length ? results.map((r, i) => `<button type="button" data-add-city="${i}">${esc(r.name)}<small>${esc(r.region)}</small></button>`).join('') : '<p>No cities found</p>';
      box._results = results;
    } catch {
      box.hidden = false;
      box.innerHTML = '<p>City search needs an internet connection.</p>';
    }
  }

  function select(i) { selected = i; persist(); renderSidebar(); renderMain(); }

  function open() {
    win = OS.wm.create({
      app: 'weather', title: 'Weather', chrome: 'toolbar', width: 900, height: 620, minWidth: 380, minHeight: 420, className: 'weather-win', lightsTop: 19, lightsLeft: 18,
      content: `<div class="weather">
        <aside class="wx-sidebar" data-drag>
          <div class="wx-sidebar-top" data-drag></div>
          <label class="wx-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14.5 14.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input type="search" placeholder="Search for a city" aria-label="Search for a city" data-city-search autocomplete="off" /></label>
          <div class="wx-results" data-results hidden></div>
          <div class="wx-cities" data-cities></div>
        </aside>
        <main class="wx-main" data-main></main>
      </div>`,
      onClose: () => { win = null; return true; },
    });
    const search = win.body.querySelector('[data-city-search]');
    search.addEventListener('input', OS.util.debounce(() => searchCities(search.value), 350));
    search.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); search.value = ''; win.body.querySelector('[data-results]').hidden = true; } });
    win.body.addEventListener('click', event => {
      const city = event.target.closest('[data-city]');
      if (city) { select(Number(city.dataset.city)); return; }
      const add = event.target.closest('[data-add-city]');
      if (add) {
        const result = win.body.querySelector('[data-results]')._results[Number(add.dataset.addCity)];
        const existing = cities.findIndex(c => keyOf(c) === keyOf(result));
        if (existing === -1) cities = [...cities, result];
        search.value = '';
        win.body.querySelector('[data-results]').hidden = true;
        select(existing === -1 ? cities.length - 1 : existing);
      }
    });
    win.body.addEventListener('contextmenu', event => {
      const city = event.target.closest('[data-city]');
      if (!city) return;
      event.preventDefault();
      const i = Number(city.dataset.city);
      OS.menu.open([{ label: `Remove ${cities[i].name}`, disabled: cities.length === 1, action: () => { cities = cities.filter((_, j) => j !== i); selected = Math.min(selected, cities.length - 1); persist(); renderSidebar(); renderMain(); } }], { x: event.clientX, y: event.clientY });
    });
    renderSidebar();
    renderMain();
    return win;
  }

  OS.weather = {
    /** Cached summary for Notification Center; starts a fetch when needed. */
    summary() {
      const city = cities[selected];
      const hit = cache.get(keyOf(city));
      if (!hit) { fetchCity(city).then(() => { if (OS.notificationCenter.isOpen()) OS.notificationCenter.refresh(); }); return null; }
      const d = hit.data;
      const c = condition(d.current.code, d.current.isDay);
      return { city: city.name, temp: `${d.current.temp}°`, condition: c.text, icon: c.icon, range: `H:${d.daily[0].max}° L:${d.daily[0].min}°`, demo: d.demo };
    },
  };

  OS.apps.register({
    id: 'weather',
    name: 'Weather',
    icon: 'images/icons/apps/weather.png',
    keywords: ['forecast', 'temperature', 'rain', 'climate'],
    single: true,
    version: '5.0',
    about: 'Hourly and 10-day forecasts from Open-Meteo. Search to add cities; they’re remembered in this browser.',
    help: 'Search for a city to add it. Right-click a city to remove it. Without an internet connection, Weather shows sample data and says so.',
    open,
    menus: () => [
      { title: 'View', items: [
        { label: 'Refresh', disabled: !win, action: () => { cache.delete(keyOf(cities[selected])); renderMain(); renderSidebar(); } },
        '-',
        ...cities.map((city, i) => ({ label: city.name, checked: i === selected, disabled: !win, action: () => select(i) })),
      ] },
    ],
  });
})();
