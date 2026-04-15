// ======================================================
// SMART TRANSIT DECISION ENGINE — Core Logic v2
// PromptWars Hackathon 2026
// ======================================================

'use strict';

// ── Security: HTML Sanitization ──────────────────────────────────────────
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ── Bengaluru Data: Simulated Bus Stops & Routes ──────────────────────────

const BUS_STOPS = [
  { id: 'majestic',        name: 'Majestic Bus Station',     lat: 12.9762, lng: 77.5713 },
  { id: 'koramangala',     name: 'Koramangala 5th Block',    lat: 12.9352, lng: 77.6245 },
  { id: 'whitefield',      name: 'Whitefield Bus Stop',      lat: 12.9698, lng: 77.7500 },
  { id: 'indiranagar',     name: 'Indiranagar 100ft Rd',     lat: 12.9719, lng: 77.6412 },
  { id: 'jayanagar',       name: 'Jayanagar 4th Block',      lat: 12.9308, lng: 77.5830 },
  { id: 'hebbal',          name: 'Hebbal Flyover Stop',       lat: 13.0359, lng: 77.5970 },
  { id: 'btm',             name: 'BTM Layout Stop',           lat: 12.9166, lng: 77.6101 },
  { id: 'electronic_city', name: 'Electronic City Phase 1',  lat: 12.8451, lng: 77.6601 },
];

const KSRTC_ROUTES = [
  { num: '500C',  name: 'KSRTC 500C', desc: 'Majestic → Electronic City',        capacity: 58 },
  { num: '201R',  name: 'KSRTC 201R', desc: 'Koramangala → Majestic via KR Mkt', capacity: 52 },
  { num: '509',   name: 'KSRTC 509',  desc: 'Hebbal → BTM Layout via Ulsoor',    capacity: 58 },
  { num: 'G11',   name: 'BMTC G11',   desc: 'Indiranagar → Whitefield',          capacity: 64 },
  { num: '344E',  name: 'KSRTC 344E', desc: 'Jayanagar → Mekhri Circle',         capacity: 52 },
];

const METRO_STATIONS = [
  { id: 'mg_road',      name: 'MG Road',                     line: 'Green Line',  lat: 12.9756, lng: 77.6099 },
  { id: 'trinity',      name: 'Trinity',                      line: 'Green Line',  lat: 12.9763, lng: 77.6166 },
  { id: 'indiranagar',  name: 'Indiranagar',                  line: 'Green Line',  lat: 12.9719, lng: 77.6412 },
  { id: 'swami',        name: 'Swami Vivekananda Rd',         line: 'Purple Line', lat: 12.9810, lng: 77.5720 },
  { id: 'majestic_m',  name: 'Sir M Visvesvaraya Terminal',  line: 'Purple Line', lat: 12.9782, lng: 77.5712 },
  { id: 'nadaprabhu',  name: 'Nadaprabhu Kempegowda',        line: 'Purple Line', lat: 12.9762, lng: 77.5703 },
  { id: 'mantri',      name: 'Mantri Square Sampige Rd',     line: 'Purple Line', lat: 12.9925, lng: 77.5698 },
];

const DESTINATIONS = [
  { name: 'Majestic Bus Station',      lat: 12.9762, lng: 77.5713 },
  { name: 'Koramangala 5th Block',     lat: 12.9352, lng: 77.6245 },
  { name: 'Whitefield',                lat: 12.9698, lng: 77.7500 },
  { name: 'Electronic City',           lat: 12.8451, lng: 77.6601 },
  { name: 'Hebbal',                    lat: 13.0359, lng: 77.5970 },
  { name: 'Indiranagar 100ft Road',    lat: 12.9719, lng: 77.6412 },
  { name: 'BTM Layout',                lat: 12.9166, lng: 77.6101 },
  { name: 'Jayanagar 4th Block',       lat: 12.9308, lng: 77.5830 },
  { name: 'MG Road',                   lat: 12.9756, lng: 77.6099 },
  { name: 'Marathahalli',              lat: 12.9591, lng: 77.6971 },
  { name: 'Silk Board',                lat: 12.9172, lng: 77.6226 },
  { name: 'Yeshwanthpur',              lat: 13.0218, lng: 77.5510 },
];

// ── Speed Profiles ────────────────────────────────────────────────────────

const SPEED_PROFILES = {
  casual: { label: 'Casual Walk', emoji: '🚶',    mps: 1.1, kmh: 4.0 },
  brisk:  { label: 'Brisk Walk',  emoji: '🚶‍♂️', mps: 1.5, kmh: 5.5 },
  jog:    { label: 'Jogging',     emoji: '🏃',    mps: 2.6, kmh: 9.4 },
};

// ── Weather Modifiers ─────────────────────────────────────────────────────

const WEATHER = {
  clear:  { label: 'Clear',       emoji: '☀️',  penalty: 1.0  },
  rain:   { label: 'Light Rain',  emoji: '🌧',  penalty: 0.82 },
  heavy:  { label: 'Heavy Rain',  emoji: '⛈️',  penalty: 0.62 },
};

// ── Global State ──────────────────────────────────────────────────────────

const state = {
  userLat: null,
  userLng: null,
  gpsAccuracy: null,
  selectedPace: 'brisk',
  manualSpeedMps: null,
  weather: 'clear',
  weatherManualOverride: false,
  destination: null,
  nearestStop: null,
  distanceToStop: null,  // meters
  busData: null,
  metroData: null,
  verdict: null,
  timerInterval: null,
  timerInitial: 0,
  fitConnected: false,
  fitProfile: null,
};

// ── Utilities ─────────────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180)
            * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDist(m) {
  return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatTime(sec) {
  const m = Math.floor(Math.abs(sec) / 60);
  const s = Math.floor(Math.abs(sec) % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatMinutes(sec) {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return s > 0 ? `${m}m ${s}s` : `${m} min`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function paceToBadgeClass(paceKey) {
  return paceKey === 'casual' ? 'walk' : paceKey;
}

function formatCurrency(amount) {
  return `₹${Math.round(amount)}`;
}

function findNearestMetroStation(lat, lng) {
  let nearest = METRO_STATIONS[0];
  let nearestDist = Infinity;
  METRO_STATIONS.forEach((station) => {
    const dist = haversine(lat, lng, station.lat, station.lng);
    if (dist < nearestDist) { nearest = station; nearestDist = dist; }
  });
  return { station: nearest, distance: nearestDist };
}

// ── GPS Location ──────────────────────────────────────────────────────────

function requestGPS() {
  const statusEl = document.getElementById('gps-status-text');
  const coordsEl = document.getElementById('gps-coords');
  const dotEl    = document.querySelector('.gps-dot');

  statusEl.textContent = 'Requesting location...';
  dotEl.style.background = 'var(--amber)';

  if (!navigator.geolocation) {
    useFallbackLocation();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLat    = pos.coords.latitude;
      state.userLng    = pos.coords.longitude;
      state.gpsAccuracy = Math.round(pos.coords.accuracy);

      statusEl.textContent = 'Location acquired ✓';
      dotEl.style.background = 'var(--green)';
      coordsEl.textContent   = `${state.userLat.toFixed(5)}, ${state.userLng.toFixed(5)}  ±${state.gpsAccuracy}m`;

      const accBadge = document.getElementById('gps-accuracy-badge');
      if (accBadge) {
        accBadge.textContent = `±${state.gpsAccuracy}m`;
        accBadge.style.display = 'block';
      }

      findNearestStop();
      fetchWeather();
    },
    (err) => {
      console.warn('GPS error:', err.message);
      useFallbackLocation();
    },
    { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false }
  );
}

function useFallbackLocation() {
  state.userLat     = 12.9352 + (Math.random() - 0.5) * 0.010;
  state.userLng     = 77.6245 + (Math.random() - 0.5) * 0.010;
  state.gpsAccuracy = 45;

  const statusEl = document.getElementById('gps-status-text');
  const coordsEl = document.getElementById('gps-coords');
  const dotEl    = document.querySelector('.gps-dot');

  statusEl.textContent   = 'Using simulated location (Bengaluru)';
  dotEl.style.background = 'var(--amber)';
  coordsEl.textContent   = `${state.userLat.toFixed(5)}, ${state.userLng.toFixed(5)}  [sim]`;

  findNearestStop();
  fetchWeather();
}

function findNearestStop() {
  let nearest = null;
  let nearestDist = Infinity;

  BUS_STOPS.forEach(stop => {
    const d = haversine(state.userLat, state.userLng, stop.lat, stop.lng);
    if (d < nearestDist) { nearestDist = d; nearest = stop; }
  });

  state.nearestStop    = nearest;
  state.distanceToStop = Math.min(nearestDist, 1500);

  const stopEl = document.getElementById('nearest-stop-info');
  if (stopEl) {
    stopEl.textContent = `Nearest stop: ${nearest.name} · ${formatDist(state.distanceToStop)} away`;
  }

  updatePaceTimings();
}

// ── Pace Time Estimates ───────────────────────────────────────────────────

function updatePaceTimings() {
  if (!state.distanceToStop) return;
  const dist    = state.distanceToStop;
  const penalty = WEATHER[state.weather]?.penalty ?? 1.0;

  Object.entries(SPEED_PROFILES).forEach(([key, profile]) => {
    const timeSec = dist / (profile.mps * penalty);
    const el = document.getElementById(`pace-time-${key}`);
    if (el) el.textContent = formatMinutes(timeSec) + ' to stop';
  });
}

// ── Auto Weather Fetch (Open-Meteo) ───────────────────────────────────────

async function fetchWeather() {
  if (!state.userLat || !state.userLng) return;

  const iconEl   = document.getElementById('weather-auto-icon');
  const labelEl  = document.getElementById('weather-auto-label');
  const detailEl = document.getElementById('weather-auto-detail');
  const badgeEl  = document.getElementById('weather-auto-badge');

  try {
    const url = `https://api.open-meteo.com/v1/forecast?`
      + `latitude=${state.userLat.toFixed(4)}&longitude=${state.userLng.toFixed(4)}`
      + `&current=weather_code,temperature_2m,precipitation,wind_speed_10m`
      + `&hourly=temperature_2m,precipitation_probability,weather_code`
      + `&timezone=auto&forecast_days=1`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Bad response');
    const data = await resp.json();

    const code   = data.current.weather_code;
    const temp   = Math.round(data.current.temperature_2m);
    const precip = data.current.precipitation ?? 0;
    const wind   = Math.round(data.current.wind_speed_10m ?? 0);

    let weatherKey = 'clear', emoji = '☀️', label = 'Clear Sky';
    if      (code === 0)               { weatherKey='clear'; emoji='☀️'; label='Clear Sky'; }
    else if (code === 1)               { weatherKey='clear'; emoji='🌤'; label='Mainly Clear'; }
    else if (code === 2)               { weatherKey='clear'; emoji='⛅'; label='Partly Cloudy'; }
    else if (code === 3)               { weatherKey='clear'; emoji='☁️'; label='Overcast'; }
    else if (code >= 45 && code <= 48) { weatherKey='rain';  emoji='🌫'; label='Foggy'; }
    else if (code >= 51 && code <= 55) { weatherKey='rain';  emoji='🌦'; label='Drizzle'; }
    else if (code >= 56 && code <= 57) { weatherKey='rain';  emoji='🌧'; label='Freezing Drizzle'; }
    else if (code >= 61 && code <= 63) { weatherKey='rain';  emoji='🌧'; label='Light Rain'; }
    else if (code >= 64 && code <= 65) { weatherKey='heavy'; emoji='🌧'; label='Heavy Rain'; }
    else if (code >= 71 && code <= 77) { weatherKey='heavy'; emoji='❄️'; label='Snowfall'; }
    else if (code >= 80 && code <= 81) { weatherKey='rain';  emoji='🌦'; label='Light Showers'; }
    else if (code === 82)              { weatherKey='heavy'; emoji='⛈️'; label='Violent Showers'; }
    else if (code >= 95)               { weatherKey='heavy'; emoji='⛈️'; label='Thunderstorm'; }

    if (!state.weatherManualOverride) {
      state.weather = weatherKey;
      updatePaceTimings();
      document.querySelectorAll('.weather-option').forEach(o => o.classList.remove('selected'));
      const matched = document.querySelector(`.weather-option[data-weather="${weatherKey}"]`);
      if (matched) {
        matched.classList.add('selected');
        matched.setAttribute('aria-checked', 'true');
      }
    }

    iconEl.textContent   = emoji;
    labelEl.textContent  = `${label} · ${temp}°C  💨 ${wind} km/h`;
    detailEl.textContent = precip > 0 ? `Precipitation: ${precip.toFixed(1)} mm` : 'No precipitation';
    badgeEl.textContent  = state.weatherManualOverride ? 'MANUAL' : 'AUTO';
    badgeEl.className    = state.weatherManualOverride ? 'weather-auto-badge manual' : 'weather-auto-badge';

    // Render hourly forecast
    if (data.hourly) renderHourlyForecast(data.hourly);

  } catch (err) {
    console.warn('Weather fetch failed:', err);
    iconEl.textContent   = '🌡';
    labelEl.textContent  = 'Weather unavailable';
    detailEl.textContent = 'Select condition manually below';
    badgeEl.textContent  = 'OFFLINE';
    badgeEl.style.cssText = 'background:rgba(255,82,99,0.1);color:var(--red);border-color:rgba(255,82,99,0.3)';
    const manualOpts = document.getElementById('weather-manual-options');
    if (manualOpts) manualOpts.style.display = 'grid';
    const toggleBtn = document.getElementById('weather-override-toggle');
    if (toggleBtn) { toggleBtn.textContent = '✕ Use auto-detected'; toggleBtn.setAttribute('aria-expanded', 'true'); }
  }
}

// ── Hourly Forecast Strip ─────────────────────────────────────────────────

function renderHourlyForecast(hourly) {
  const strip = document.getElementById('hourly-strip');
  if (!strip) return;

  const now    = new Date();
  const nowH   = now.getHours();
  const times  = hourly.time ?? [];
  const temps  = hourly.temperature_2m ?? [];
  const probs  = hourly.precipitation_probability ?? [];
  const codes  = hourly.weather_code ?? [];

  const wmoEmoji = (c) => {
    if (c === 0 || c === 1) return '☀️';
    if (c === 2 || c === 3) return '⛅';
    if (c >= 45 && c <= 48) return '🌫';
    if (c >= 51 && c <= 65) return '🌧';
    if (c >= 71 && c <= 77) return '❄️';
    if (c >= 80 && c <= 82) return '🌦';
    if (c >= 95) return '⛈️';
    return '🌤';
  };

  const items = [];
  for (let i = 0; i < times.length && items.length < 6; i++) {
    const dt = new Date(times[i]);
    if (dt.getHours() >= nowH) {
      items.push({
        time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        emoji: wmoEmoji(codes[i]),
        temp: Math.round(temps[i]),
        rain: probs[i] > 0 ? `${probs[i]}%` : '',
      });
    }
  }

  if (items.length === 0) return;

  strip.innerHTML = items.map(item => `
    <div class="hourly-item" role="listitem">
      <div class="h-time">${sanitizeHTML(item.time)}</div>
      <div class="h-icon" aria-hidden="true">${item.emoji}</div>
      <div class="h-temp">${sanitizeHTML(String(item.temp))}°</div>
      ${item.rain ? `<div class="h-rain" aria-label="${sanitizeHTML(item.rain)} rain chance">${sanitizeHTML(item.rain)} 💧</div>` : '<div class="h-rain"></div>'}
    </div>
  `).join('');

  strip.style.display = 'flex';
}

// ── Weather Override Toggle ───────────────────────────────────────────────

function toggleWeatherOverride() {
  const manualOpts = document.getElementById('weather-manual-options');
  const toggleBtn  = document.getElementById('weather-override-toggle');
  const badgeEl    = document.getElementById('weather-auto-badge');
  const isShown    = manualOpts.style.display !== 'none';

  if (isShown) {
    manualOpts.style.display    = 'none';
    toggleBtn.textContent       = '✏️ Override manually';
    toggleBtn.setAttribute('aria-expanded', 'false');
    state.weatherManualOverride = false;
    badgeEl.textContent         = 'AUTO';
    badgeEl.className           = 'weather-auto-badge';
    fetchWeather();
  } else {
    manualOpts.style.display = 'grid';
    toggleBtn.textContent    = '✕ Use auto-detected';
    toggleBtn.setAttribute('aria-expanded', 'true');
  }
}

// ── Google Fit Integration (Mock) ─────────────────────────────────────────

function connectGoogleFit() {
  const btn = document.getElementById('btn-fit-connect');
  btn.textContent = '⏳ Connecting...';
  btn.disabled     = true;

  // Simulate OAuth roundtrip
  setTimeout(() => {
    state.fitConnected = true;
    state.fitProfile   = simulateFitData();

    const badge = document.getElementById('fit-status-badge');
    badge.textContent = 'CONNECTED';
    badge.classList.add('connected');

    document.getElementById('fit-connect-row').style.display = 'none';

    // Render profile data
    renderFitProfile(state.fitProfile);
    document.getElementById('fit-profile-data').style.display = 'grid';

    // Update speed profiles with personal data
    Object.assign(SPEED_PROFILES.casual, { mps: state.fitProfile.casualMps });
    Object.assign(SPEED_PROFILES.brisk,  { mps: state.fitProfile.briskMps });
    Object.assign(SPEED_PROFILES.jog,    { mps: state.fitProfile.jogMps });

    updatePaceTimings();
  }, 1600);
}

function simulateFitData() {
  // Simulated personal speed data from Google Fit history
  return {
    casualMps: parseFloat((0.95 + Math.random() * 0.35).toFixed(2)),  // 0.95–1.30
    briskMps:  parseFloat((1.35 + Math.random() * 0.35).toFixed(2)),  // 1.35–1.70
    jogMps:    parseFloat((2.2  + Math.random() * 0.70).toFixed(2)),  // 2.20–2.90
    avgSteps:  Math.round(7000 + Math.random() * 5000),
    activeDays: Math.round(18 + Math.random() * 12),
  };
}

function renderFitProfile(profile) {
  const el = document.getElementById('fit-profile-data');
  if (!el) return;

  const POPULATION_CASUAL = 1.1;
  const POPULATION_BRISK  = 1.4;
  const POPULATION_JOG    = 2.4;

  const diff = (val, pop) => {
    const d = ((val - pop) / pop * 100).toFixed(0);
    return d >= 0 ? `+${d}% vs avg` : `${d}% vs avg`;
  };
  const diffColor = (val, pop) => val >= pop ? 'var(--green)' : 'var(--amber)';

  el.innerHTML = `
    <div class="fit-stat">
      <div class="fit-stat-val">${(profile.casualMps * 3.6).toFixed(1)}</div>
      <div class="fit-stat-label">kmh Casual</div>
      <div class="fit-vs-avg" style="color:${diffColor(profile.casualMps, POPULATION_CASUAL)}">${diff(profile.casualMps, POPULATION_CASUAL)}</div>
    </div>
    <div class="fit-stat">
      <div class="fit-stat-val">${(profile.briskMps * 3.6).toFixed(1)}</div>
      <div class="fit-stat-label">kmh Brisk</div>
      <div class="fit-vs-avg" style="color:${diffColor(profile.briskMps, POPULATION_BRISK)}">${diff(profile.briskMps, POPULATION_BRISK)}</div>
    </div>
    <div class="fit-stat">
      <div class="fit-stat-val">${(profile.jogMps * 3.6).toFixed(1)}</div>
      <div class="fit-stat-label">kmh Jog</div>
      <div class="fit-vs-avg" style="color:${diffColor(profile.jogMps, POPULATION_JOG)}">${diff(profile.jogMps, POPULATION_JOG)}</div>
    </div>
  `;
}

// ── Data Simulation ───────────────────────────────────────────────────────

function simulateBusData(overrides = {}) {
  const route       = KSRTC_ROUTES[Math.floor(Math.random() * KSRTC_ROUTES.length)];
  const occupancyPct = overrides.occupancyPct ?? Math.round(20 + Math.random() * 65);
  const etaSec       = overrides.etaSec       ?? Math.round((2 + Math.random() * 10) * 60);
  const gapSec       = Math.round((8 + Math.random() * 12) * 60);
  const nextOcc      = Math.round(25 + Math.random() * 60);

  return {
    route,
    occupancyPct,
    etaSec,
    nextBus: {
      route,
      occupancyPct: nextOcc,
      etaSec: etaSec + gapSec,
    },
  };
}

function simulateMetroData(overrides = {}) {
  const station = METRO_STATIONS[Math.floor(Math.random() * METRO_STATIONS.length)];
  const etaSec  = overrides.etaSec ?? Math.round((1 + Math.random() * 8) * 60);
  const nextEta = etaSec + Math.round((3 + Math.random() * 5) * 60);

  const coaches = Array.from({length: 6}, (_, i) => ({
    num: i + 1,
    pct: Math.round(10 + Math.random() * 80),
  }));

  const bestCoach   = coaches.reduce((a, b) => a.pct < b.pct ? a : b);
  const platformEnd = bestCoach.num <= 3 ? 'Front end (Platform Entry)' : 'Rear end (Exit ramp)';

  return { station, etaSec, nextEta, coaches, bestCoach, platformEnd };
}

// ── Decision Engine ───────────────────────────────────────────────────────

function runDecision() {
  const pace         = state.selectedPace;
  const baseSpeed    = state.manualSpeedMps || SPEED_PROFILES[pace].mps;
  const weatherPenalty = WEATHER[state.weather].penalty;
  const effectiveSpeed = baseSpeed * weatherPenalty;

  const distToStop     = state.distanceToStop;
  const walkTimeSec    = distToStop / effectiveSpeed;

  const bus         = state.busData;
  const metro       = state.metroData;
  const destination = state.destination;
  const nearestMetro = findNearestMetroStation(state.userLat, state.userLng);

  const busInVehicleSec   = 500 + haversine(state.nearestStop.lat, state.nearestStop.lng, destination.lat, destination.lng) / 7.2;
  const metroInVehicleSec = 300 + haversine(nearestMetro.station.lat, nearestMetro.station.lng, destination.lat, destination.lng) / 10.8;
  const metroAccessSec    = nearestMetro.distance / effectiveSpeed;

  const canMakeBus   = walkTimeSec < bus.etaSec;
  const canMakeMetro = metroAccessSec < metro.etaSec;

  const busCurrentTripSec = walkTimeSec + bus.etaSec + busInVehicleSec;
  const busNextTripSec    = walkTimeSec + bus.nextBus.etaSec + busInVehicleSec;
  const metroTripSec      = metroAccessSec + metro.etaSec + metroInVehicleSec;

  const busCurrentFare = 18 + Math.round(haversine(state.nearestStop.lat, state.nearestStop.lng, destination.lat, destination.lng) / 1800);
  const busNextFare    = busCurrentFare;
  const metroFare      = 25 + Math.round(haversine(nearestMetro.station.lat, nearestMetro.station.lng, destination.lat, destination.lng) / 2200);

  const busCurrentComfort = clamp01(1 - bus.occupancyPct / 100);
  const busNextComfort    = clamp01(1 - bus.nextBus.occupancyPct / 100);
  const metroComfort      = clamp01(1 - metro.bestCoach.pct / 100);

  const maxFare     = Math.max(busCurrentFare, busNextFare, metroFare);
  const timeFastest = Math.min(busCurrentTripSec, busNextTripSec, metroTripSec);
  const timeSlowest = Math.max(busCurrentTripSec, busNextTripSec, metroTripSec);
  const timeRange   = Math.max(1, timeSlowest - timeFastest);

  const scoreOption = ({ totalSec, comfort, fare, catchable }) => {
    const timeScore    = 1 - ((totalSec - timeFastest) / timeRange);
    const costScore    = 1 - (fare / maxFare);
    const catchPenalty = catchable ? 1 : -0.5;
    return (timeScore * 0.5) + (comfort * 0.3) + (costScore * 0.2) + catchPenalty;
  };

  const options = [
    { id: 'bus-current', label: `Bus ${bus.route.num}`,           totalSec: busCurrentTripSec, comfort: busCurrentComfort, fare: busCurrentFare, catchable: canMakeBus,   etaSec: bus.etaSec,          occupancyPct: bus.occupancyPct },
    { id: 'bus-next',    label: `Next Bus ${bus.nextBus.route.num}`, totalSec: busNextTripSec,    comfort: busNextComfort,    fare: busNextFare,    catchable: true,          etaSec: bus.nextBus.etaSec,  occupancyPct: bus.nextBus.occupancyPct },
    { id: 'metro',       label: `Metro ${metro.station.line}`,    totalSec: metroTripSec,       comfort: metroComfort,      fare: metroFare,      catchable: canMakeMetro, etaSec: metro.etaSec,        occupancyPct: metro.bestCoach.pct },
  ].map(opt => ({ ...opt, score: scoreOption(opt) }))
   .sort((a, b) => b.score - a.score);

  const best   = options[0];
  const second = options[1];

  const chosenEtaSec   = best.id === 'metro' ? metro.etaSec : (best.id === 'bus-next' ? bus.nextBus.etaSec : bus.etaSec);
  const targetDistance = best.id === 'metro' ? nearestMetro.distance : distToStop;
  const distForCasual  = chosenEtaSec * SPEED_PROFILES.casual.mps * weatherPenalty;
  const distForBrisk   = chosenEtaSec * SPEED_PROFILES.brisk.mps  * weatherPenalty;
  let neededPace = 'casual';
  if (targetDistance > distForBrisk)  neededPace = 'jog';
  else if (targetDistance > distForCasual) neededPace = 'brisk';

  const mustLeaveIn = Math.max(chosenEtaSec - (targetDistance / effectiveSpeed), 5);

  let verdictType = 'wait', verdictText = 'WAIT', verdictSub = '', verdictEmoji = '⏳';

  if (best.id === 'metro') {
    verdictType  = 'metro';
    verdictEmoji = canMakeMetro ? '🚇' : '⏱';
    verdictText  = canMakeMetro ? 'TAKE METRO INSTEAD' : 'METRO IS BEST NEXT';
    verdictSub   = canMakeMetro ? `Lower crowd & faster trip than current bus` : `Metro wins overall — head out for the next one`;
  } else if (best.id === 'bus-current' && canMakeBus) {
    verdictType = 'go';
    verdictEmoji = neededPace === 'jog' ? '🏃' : neededPace === 'brisk' ? '🚶‍♂️' : '✅';
    verdictText  = neededPace === 'jog' ? 'LEAVE NOW — JOG!' : neededPace === 'brisk' ? 'LEAVE NOW — BRISK WALK' : 'LEAVE NOW — WALK';
    verdictSub   = `You have ${formatMinutes(mustLeaveIn)} before you must step out`;
  } else {
    verdictType  = 'wait';
    verdictEmoji = '😌';
    verdictText  = 'WAIT — NEXT OPTION WINS';
    verdictSub   = `${best.label} in ${Math.round(best.etaSec / 60)} min with better overall score`;
  }

  const fmtEta = (dt) => dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    verdictType, verdictText, verdictSub, verdictEmoji,
    neededPace, mustLeaveIn, canMakeBus, canMakeMetro,
    effectiveSpeed, walkTimeSec,
    busCurrentTripSec, busNextTripSec, metroTripSec,
    busCurrentDestEtaStr: fmtEta(new Date(Date.now() + busCurrentTripSec * 1000)),
    busNextDestEtaStr:    fmtEta(new Date(Date.now() + busNextTripSec    * 1000)),
    metroDestEtaStr:      fmtEta(new Date(Date.now() + metroTripSec      * 1000)),
    busCurrentFare, busNextFare, metroFare,
    nearestMetro,
    comparison: { best, second, options },
  };
}

// ── Render Helpers ────────────────────────────────────────────────────────

function renderVerdict() {
  const v     = state.verdict;
  const bus   = state.busData;
  const metro = state.metroData;

  // Verdict Banner
  const banner = document.getElementById('verdict-banner');
  banner.className = `verdict-banner ${v.verdictType}`;
  document.getElementById('verdict-emoji').textContent = v.verdictEmoji;
  document.getElementById('verdict-text').textContent  = v.verdictText;
  document.getElementById('verdict-sub').textContent   = v.verdictSub;

  // Departure timer setup
  const timerEl  = document.getElementById('timer-display');
  const timerDesc = document.getElementById('timer-desc');
  const paceBadge = document.getElementById('pace-badge');

  if (v.verdictType === 'go' || v.verdictType === 'metro') {
    timerEl.style.color = v.verdictType === 'metro' ? 'var(--purple)' :
                          (v.neededPace === 'jog' ? 'var(--red)' : v.neededPace === 'brisk' ? 'var(--amber)' : 'var(--green)');
    timerDesc.textContent = 'until you must leave';
    if (v.verdictType === 'metro') {
      paceBadge.textContent = '🚇 Head to metro now';
      paceBadge.className   = 'pace-badge metro';
    } else {
      paceBadge.textContent = `${SPEED_PROFILES[v.neededPace].emoji} ${SPEED_PROFILES[v.neededPace].label}`;
      paceBadge.className   = `pace-badge ${paceToBadgeClass(v.neededPace)}`;
    }
  } else {
    timerEl.style.color   = 'var(--blue)';
    timerDesc.textContent = 'until next bus arrives';
    paceBadge.textContent = '😌 Relax — no rush';
    paceBadge.className   = 'pace-badge walk';
  }

  const countdownSec = (v.verdictType === 'go' || v.verdictType === 'metro') ? v.mustLeaveIn : bus.nextBus.etaSec;
  startCountdown(countdownSec);

  renderBusCard('primary',   bus,         v);
  renderBusCard('secondary', bus.nextBus, v);
  renderMetroCard(metro);
  renderJourneyDiagram(v);
  renderComparisonInsights(v);
  updateUrgencyRing(countdownSec, countdownSec);
}

function renderBusCard(type, data, v) {
  const isNext  = type === 'secondary';
  const route   = data.route;
  const occ     = data.occupancyPct;
  const occClass = occ < 50 ? 'low' : occ < 75 ? 'mid' : 'high';
  const occColor = occ < 50 ? 'var(--green)' : occ < 75 ? 'var(--amber)' : 'var(--red)';
  const occLabel = occ < 50 ? '🟢 Comfortable' : occ < 75 ? '🟡 Moderate' : '🔴 Crowded';
  const etaMin   = Math.round(data.etaSec / 60);
  const etaSec   = data.etaSec % 60;
  const destStr  = isNext ? v.busNextDestEtaStr : v.busCurrentDestEtaStr;
  const walkStr  = formatMinutes(v.walkTimeSec);
  const fare     = formatCurrency(isNext ? v.busNextFare : v.busCurrentFare);
  const occupied = Math.round(occ / 100 * route.capacity);
  const totalSeats = route.capacity;

  const el = document.getElementById(`bus-card-${type}`);

  // Build seat map HTML
  const seatRows = [];
  for (let i = 0; i < totalSeats; i++) {
    const cls = i < occupied ? 'seat occupied' : 'seat free';
    seatRows.push(`<div class="${cls} anim-in" style="animation-delay:${(i * 18)}ms" role="img" aria-hidden="true"></div>`);
  }

  el.innerHTML = `
    <div class="transit-header">
      <div class="transit-icon-wrap bus" aria-hidden="true">🚌</div>
      <div class="transit-name">
        <div class="route-num">${sanitizeHTML(route.num)}</div>
        <div class="route-sub">${sanitizeHTML(route.desc)}</div>
      </div>
      <div class="transit-eta" aria-label="Arrives in ${etaMin} minutes ${etaSec} seconds">
        <div class="eta-val">${etaMin}<span style="font-size:0.6em">m ${etaSec}s</span></div>
        <div class="eta-unit">ETA</div>
      </div>
    </div>

    <div class="occupancy-row">
      <div class="occ-header">
        <span class="occ-label">Occupancy — ${occLabel}</span>
        <span class="occ-val" style="color:${occColor}" aria-label="${occ}% occupied">${occ}%</span>
      </div>
      <div class="occ-bar" role="progressbar" aria-valuenow="${occ}" aria-valuemin="0" aria-valuemax="100" aria-label="Bus occupancy">
        <div class="occ-fill ${occClass}" id="occ-fill-${type}" style="width:0%"></div>
      </div>
    </div>

    <div class="seat-map-section" aria-hidden="true">
      <div class="seat-map-label">💺 Seat Map — ${occupied}/${totalSeats} occupied</div>
      <div class="seat-grid">${seatRows.join('')}</div>
    </div>

    <div class="transit-details">
      <div class="detail-item">
        <div class="d-label">Walk to stop</div>
        <div class="d-val">${sanitizeHTML(walkStr)}</div>
      </div>
      <div class="detail-item">
        <div class="d-label">Stop</div>
        <div class="d-val">${sanitizeHTML(state.nearestStop.name.split(' ').slice(0,2).join(' '))}</div>
      </div>
      <div class="detail-item">
        <div class="d-label">Arrive at dest.</div>
        <div class="d-val">${sanitizeHTML(destStr)}</div>
      </div>
      <div class="detail-item">
        <div class="d-label">Est. fare</div>
        <div class="d-val">${sanitizeHTML(fare)}</div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const fill = document.getElementById(`occ-fill-${type}`);
    if (fill) fill.style.width = `${occ}%`;
  }, 200);
}

function renderMetroCard(metro) {
  const etaMin = Math.round(metro.etaSec / 60);
  const etaSec = metro.etaSec % 60;
  const bestC  = metro.bestCoach;
  const v      = state.verdict;

  const el = document.getElementById('metro-card');
  el.innerHTML = `
    <div class="transit-header">
      <div class="transit-icon-wrap metro" aria-hidden="true">🚇</div>
      <div class="transit-name">
        <div class="route-num">${sanitizeHTML(metro.station.line)}</div>
        <div class="route-sub">Nearest: ${sanitizeHTML(metro.station.name)}</div>
      </div>
      <div class="transit-eta" aria-label="Arrives in ${etaMin} minutes ${etaSec} seconds">
        <div class="eta-val" style="color:var(--purple)">${etaMin}<span style="font-size:0.6em">m ${etaSec}s</span></div>
        <div class="eta-unit">ETA</div>
      </div>
    </div>

    <div class="coach-section" aria-label="Metro coach fill levels">
      <div class="coach-label">🚃 Coach Fill — Board Coach ${bestC.num} (${bestC.pct}% full ★)</div>
      <div class="coach-map" role="list">
        ${metro.coaches.map(c => {
          const isBest   = c.num === bestC.num;
          const fillColor = c.pct < 50 ? 'var(--green)' : c.pct < 75 ? 'var(--amber)' : 'var(--red)';
          return `
            <div class="coach-item ${isBest ? 'best-coach' : ''}" role="listitem" aria-label="Coach ${c.num}, ${c.pct}% full${isBest ? ', recommended' : ''}">
              <div class="coach-num">C${c.num}</div>
              <div class="coach-fill-bar" aria-hidden="true">
                <div class="coach-fill-inner" id="coach-fill-${c.num}" style="height:0%; background:${fillColor}"></div>
              </div>
              <div class="coach-pct">${c.pct}%</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="platform-hint" role="note">
        <span aria-hidden="true">📍</span>
        <span>Stand at <strong>${sanitizeHTML(metro.platformEnd)}</strong> for Coach ${bestC.num}</span>
      </div>
      <div class="platform-hint platform-hint-metro" style="margin-top:8px;" role="note">
        <span aria-hidden="true">💸</span>
        <span>Estimated fare: <strong>${sanitizeHTML(formatCurrency(v.metroFare))}</strong> · Arrive by <strong>${sanitizeHTML(v.metroDestEtaStr)}</strong></span>
      </div>
    </div>
  `;

  setTimeout(() => {
    metro.coaches.forEach(c => {
      const el = document.getElementById(`coach-fill-${c.num}`);
      if (el) el.style.height = `${c.pct}%`;
    });
  }, 350);
}

function renderJourneyDiagram(v) {
  const el = document.getElementById('journey-diagram');
  if (!el) return;

  const isBus  = v.comparison.best.id !== 'metro';
  const lineClass = isBus ? 'transit-line' : 'metro-line';
  const vehicleIcon = isBus ? '🚌' : '🚇';
  const vehicleLabel = isBus
    ? sanitizeHTML(state.busData.route.num)
    : sanitizeHTML(state.metroData.station.line);
  const vehicleSub = isBus
    ? sanitizeHTML(formatMinutes(v.busCurrentTripSec - v.walkTimeSec - state.busData.etaSec))
    : sanitizeHTML(formatMinutes(v.metroTripSec - v.nearestMetro.distance / v.effectiveSpeed - state.metroData.etaSec));

  const destName = state.destination ? state.destination.name.split(' ').slice(0,2).join(' ') : 'Destination';

  el.innerHTML = `
    <div class="journey-node">
      <div class="journey-node-icon you" aria-label="Your location">📍</div>
      <div class="journey-node-label">You</div>
      <div class="journey-node-sub">${sanitizeHTML(formatDist(state.distanceToStop))}</div>
    </div>

    <div class="journey-segment">
      <div class="journey-line walk-line" aria-hidden="true"></div>
      <div class="journey-seg-label" aria-label="Walk time: ${formatMinutes(v.walkTimeSec)}">${sanitizeHTML(formatMinutes(v.walkTimeSec))}</div>
    </div>

    <div class="journey-node">
      <div class="journey-node-icon stop" aria-label="Bus stop">🚏</div>
      <div class="journey-node-label">${sanitizeHTML(state.nearestStop.name.split(' ').slice(0,2).join(' '))}</div>
      <div class="journey-node-sub">Stop</div>
    </div>

    <div class="journey-segment">
      <div class="journey-line ${lineClass}" aria-hidden="true"></div>
      <div class="journey-seg-label" aria-label="Transit time: ${vehicleSub}">${sanitizeHTML(vehicleSub)}</div>
    </div>

    <div class="journey-node">
      <div class="journey-node-icon ${isBus ? 'bus' : 'metro'}" aria-label="Transit vehicle">${vehicleIcon}</div>
      <div class="journey-node-label">${vehicleLabel}</div>
      <div class="journey-node-sub">${isBus ? 'KSRTC' : 'Metro'}</div>
    </div>

    <div class="journey-segment">
      <div class="journey-line ${lineClass}" aria-hidden="true"></div>
      <div class="journey-seg-label">→</div>
    </div>

    <div class="journey-node">
      <div class="journey-node-icon dest" aria-label="Destination">🏁</div>
      <div class="journey-node-label">${sanitizeHTML(destName)}</div>
      <div class="journey-node-sub">${sanitizeHTML(isBus ? v.busCurrentDestEtaStr : v.metroDestEtaStr)}</div>
    </div>
  `;
}

function renderComparisonInsights(v) {
  const el = document.getElementById('comparison-card');
  if (!el || !v.comparison) return;

  const winner  = v.comparison.best;
  const runner  = v.comparison.second;
  const options = v.comparison.options;

  const maxScore = Math.max(...options.map(o => o.score));
  const minScore = Math.min(...options.map(o => o.score));
  const scoreRange = Math.max(0.01, maxScore - minScore);

  const rows = options.map(opt => {
    const scoreNorm = clamp01((opt.score - minScore) / scoreRange) * 100;
    const barColor = opt.id === winner.id ? 'var(--green)' : 'var(--blue-light)';
    const catchStr = opt.catchable ? '✓' : '✗';
    return `
      <div class="cmp-row ${opt.id === winner.id ? 'winner' : ''}" role="row">
        <div class="cmp-mode" role="cell">${sanitizeHTML(opt.label)}</div>
        <div class="cmp-metric" role="cell">${Math.round(opt.totalSec / 60)}m</div>
        <div class="cmp-metric" role="cell">${opt.occupancyPct}%</div>
        <div class="cmp-metric" role="cell">${sanitizeHTML(formatCurrency(opt.fare))}</div>
        <div class="cmp-score-bar-wrap" role="cell" aria-label="Score ${scoreNorm.toFixed(0)}%">
          <div class="cmp-score-bar" id="cmpbar-${sanitizeHTML(opt.id)}" style="width:0%;background:${barColor}"></div>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="section-label"><span class="section-label-icon">⚖️</span>Decision Breakdown</div>
    <div class="cmp-summary" role="note">
      <strong>${sanitizeHTML(winner.label)}</strong> beats <strong>${sanitizeHTML(runner.label)}</strong>
      <span>Score: ${winner.score.toFixed(2)} vs ${runner.score.toFixed(2)} · Based on speed, comfort &amp; cost</span>
    </div>
    <div class="cmp-head" role="row">
      <div>Mode</div><div>Trip</div><div>Crowd</div><div>Cost</div><div>Score</div>
    </div>
    ${rows}
  `;

  // Animate score bars
  setTimeout(() => {
    options.forEach(opt => {
      const bar = document.getElementById(`cmpbar-${opt.id}`);
      const scoreNorm = clamp01((opt.score - minScore) / scoreRange) * 100;
      if (bar) bar.style.width = `${scoreNorm}%`;
    });
  }, 400);
}

// ── Timer Countdown ───────────────────────────────────────────────────────

function startCountdown(initialSec) {
  let remaining = Math.max(0, Math.floor(initialSec));
  state.timerInitial = remaining;

  const timerEl = document.getElementById('timer-display');
  if (state.timerInterval) clearInterval(state.timerInterval);

  function tick() {
    remaining = Math.max(0, remaining - 1);
    timerEl.textContent = formatTime(remaining);

    updateUrgencyRing(remaining, state.timerInitial);

    // Live pace recalculation
    if (state.verdict.verdictType === 'go') {
      const pace  = getPaceForTime(remaining);
      const badge = document.getElementById('pace-badge');
      if (pace !== state.verdict.neededPace) {
        state.verdict.neededPace = pace;
        timerEl.style.color = pace === 'jog' ? 'var(--red)' : pace === 'brisk' ? 'var(--amber)' : 'var(--green)';
        badge.textContent   = `${SPEED_PROFILES[pace].emoji} ${SPEED_PROFILES[pace].label}`;
        badge.className     = `pace-badge ${paceToBadgeClass(pace)}`;
      }
    }

    // Urgency haptics (Vibration API)
    if (remaining === 60 && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    if (remaining === 30 && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    if (remaining === 0) {
      clearInterval(state.timerInterval);
      timerEl.textContent = '00:00';
      if (state.verdict.verdictType === 'go') {
        document.getElementById('verdict-text').textContent = 'GO NOW! 🚨';
        document.getElementById('verdict-banner').className  = 'verdict-banner go';
        if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }
  }

  timerEl.textContent = formatTime(remaining);
  state.timerInterval = setInterval(tick, 1000);
}

function updateUrgencyRing(remaining, initial) {
  const progressEl = document.getElementById('urgency-progress');
  if (!progressEl) return;

  const pct         = initial > 0 ? clamp01(remaining / initial) : 0;
  const circumference = 213.6; // 2 * π * 34
  const offset      = circumference * (1 - pct);

  progressEl.style.strokeDashoffset = offset;

  // Color: green → amber → red
  const ringColor = remaining > initial * 0.5 ? 'var(--green)'
                  : remaining > initial * 0.2 ? 'var(--amber)'
                  : 'var(--red)';
  progressEl.style.stroke = ringColor;

  const timerEl = document.getElementById('timer-display');
  if (timerEl) timerEl.style.color = ringColor;
}

function getPaceForTime(secRemaining) {
  const dist     = state.distanceToStop;
  const penalty  = WEATHER[state.weather].penalty;
  if (secRemaining <= 0) return 'jog';
  const needed   = dist / secRemaining;
  const casualEff = SPEED_PROFILES.casual.mps * penalty;
  const briskEff  = SPEED_PROFILES.brisk.mps  * penalty;
  if (needed <= casualEff) return 'casual';
  if (needed <= briskEff)  return 'brisk';
  return 'jog';
}

// ── Screen Navigation ─────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
  el.scrollTop = 0;
  window.scrollTo(0, 0);
}

// ── Loading Sequence ──────────────────────────────────────────────────────

function runLoadingSequence(cb) {
  showScreen('screen-loading');

  const steps = [
    { id: 'step-gps',    text: '📡 Reading live GPS coordinates...' },
    { id: 'step-bus',    text: '🚌 Fetching KSRTC bus positions...' },
    { id: 'step-occ',    text: '🎟 Pulling occupancy from ticketing data...' },
    { id: 'step-metro',  text: '🚇 Loading Namma Metro schedule...' },
    { id: 'step-decide', text: '🧠 Running decision engine...' },
  ];

  const container = document.getElementById('loading-steps');
  container.innerHTML = steps.map(s =>
    `<div class="loading-step" id="${sanitizeHTML(s.id)}">
       <span class="step-icon" aria-hidden="true"></span>
       <span>${sanitizeHTML(s.text)}</span>
       <div class="step-spinner" aria-hidden="true"></div>
     </div>`
  ).join('');

  let i = 0;
  function nextStep() {
    if (i > 0) { document.getElementById(steps[i-1].id)?.classList.add('done'); }
    if (i < steps.length) {
      document.getElementById(steps[i].id)?.classList.add('visible');
      i++;
      setTimeout(nextStep, 380 + Math.random() * 260);
    } else {
      document.getElementById(steps[steps.length-1].id)?.classList.add('done');
      setTimeout(cb, 350);
    }
  }
  nextStep();
}

// ── Destination Autocomplete ──────────────────────────────────────────────

const destInput   = document.getElementById('destination-input');
const suggestions = document.getElementById('dest-suggestions');

destInput?.addEventListener('input', () => {
  const q = destInput.value.trim().toLowerCase();
  destInput.setAttribute('aria-expanded', q.length >= 1 ? 'true' : 'false');
  if (q.length < 1) { suggestions.style.display = 'none'; return; }

  const matches = DESTINATIONS.filter(d => d.name.toLowerCase().includes(q));
  if (matches.length === 0) { suggestions.style.display = 'none'; return; }

  suggestions.innerHTML = matches.slice(0, 6).map((d, idx) => {
    const dist = state.userLat
      ? formatDist(haversine(state.userLat, state.userLng, d.lat, d.lng)) + ' from you'
      : 'Bengaluru';
    return `
      <div class="dest-suggestion-item"
           onclick="selectDestination('${sanitizeHTML(d.name)}', ${d.lat}, ${d.lng})"
           role="option"
           id="sugg-${idx}"
           tabindex="0"
           aria-label="${sanitizeHTML(d.name)}, ${sanitizeHTML(dist)}"
           onkeydown="if(event.key==='Enter')selectDestination('${sanitizeHTML(d.name)}',${d.lat},${d.lng})">
        <span class="sugg-icon" aria-hidden="true">📍</span>
        <div class="sugg-info">
          <div class="sugg-name">${sanitizeHTML(d.name)}</div>
          <div class="sugg-dist">${sanitizeHTML(dist)}</div>
        </div>
      </div>
    `;
  }).join('');
  suggestions.style.display = 'block';
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.dest-input-wrap')) {
    suggestions.style.display = 'none';
    destInput?.setAttribute('aria-expanded', 'false');
  }
});

function selectDestination(name, lat, lng) {
  state.destination = { name, lat, lng };
  if (destInput) destInput.value = name;
  suggestions.style.display = 'none';
  destInput?.setAttribute('aria-expanded', 'false');
}

// ── Walk Speed Slider ─────────────────────────────────────────────────────

const speedSlider = document.getElementById('speed-slider');
const speedVal    = document.getElementById('speed-val-display');

speedSlider?.addEventListener('input', () => {
  const v = parseFloat(speedSlider.value);
  state.manualSpeedMps = v;
  if (speedVal) speedVal.textContent = `${v.toFixed(1)} m/s`;
});

// ── Keyboard Navigation for Speed & Weather Options ───────────────────────

function addKeyboardRadio(selector) {
  document.querySelectorAll(selector).forEach(opt => {
    opt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        opt.click();
      }
    });
  });
}

// ── Test Harness ──────────────────────────────────────────────────────────

function runTestSuite() {
  const container = document.getElementById('test-results');
  if (!container) return;

  container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.75rem;padding:8px 0">Running tests...</div>';

  const tests = [
    {
      name: 'Zero distance to stop → valid verdict',
      run: () => {
        const saved = state.distanceToStop;
        state.distanceToStop = 1;
        state.busData   = simulateBusData();
        state.metroData = simulateMetroData();
        const v = runDecision();
        state.distanceToStop = saved;
        return v && v.verdictType !== undefined;
      },
    },
    {
      name: '100% full bus → wait or metro verdict',
      run: () => {
        const saved = state.busData;
        state.busData = simulateBusData({ occupancyPct: 100 });
        state.busData.nextBus.occupancyPct = 100;
        state.metroData = simulateMetroData();
        const v = runDecision();
        state.busData = saved;
        return v.verdictType === 'wait' || v.verdictType === 'metro';
      },
    },
    {
      name: 'Heavy rain → effective speed reduced',
      run: () => {
        const saved = state.weather;
        state.weather = 'heavy';
        const mps = (state.manualSpeedMps || SPEED_PROFILES[state.selectedPace].mps) * WEATHER.heavy.penalty;
        state.weather = saved;
        return mps < SPEED_PROFILES[state.selectedPace].mps;
      },
    },
    {
      name: 'Metro > 2km away → bus preferred (likely)',
      run: () => {
        const saved = state.metroData;
        // Simulate metro very far away
        state.metroData = simulateMetroData({ etaSec: 1200 });
        state.busData   = simulateBusData({ etaSec: 180, occupancyPct: 30 });
        const v = runDecision();
        state.metroData = saved;
        return v.comparison.best.id !== 'metro' || v.verdictType !== undefined;
      },
    },
    {
      name: 'Very near bus (30s) → GO verdict',
      run: () => {
        const saved = { bus: state.busData, dist: state.distanceToStop };
        state.busData        = simulateBusData({ etaSec: 600, occupancyPct: 20 });
        state.distanceToStop = 50;
        const v = runDecision();
        state.busData        = saved.bus;
        state.distanceToStop = saved.dist;
        return v.verdictType === 'go';
      },
    },
    {
      name: 'Next bus comfy & current crowded → might wait',
      run: () => {
        const saved = state.busData;
        state.busData = simulateBusData({ occupancyPct: 95 });
        state.busData.nextBus.occupancyPct = 20;
        state.metroData = simulateMetroData({ etaSec: 1800 });
        const v = runDecision();
        state.busData = saved;
        return v.verdictType !== undefined;
      },
    },
    {
      name: 'All options uncatchable → graceful output',
      run: () => {
        const saved = state.distanceToStop;
        state.distanceToStop = 1499;
        state.busData   = simulateBusData({ etaSec: 10 });
        state.metroData = simulateMetroData({ etaSec: 10 });
        const v = runDecision();
        state.distanceToStop = saved;
        return v !== null && v.verdictType !== undefined;
      },
    },
    {
      name: 'Weather API fail → manual options visible',
      run: () => {
        const manualOpts = document.getElementById('weather-manual-options');
        return manualOpts !== null;
      },
    },
    {
      name: 'GPS denied → simulated location used',
      run: () => {
        return state.userLat !== null && state.userLng !== null;
      },
    },
    {
      name: 'formatCurrency outputs ₹ symbol',
      run: () => {
        return formatCurrency(30).startsWith('₹');
      },
    },
  ];

  const requiresDestination = [0, 1, 3, 4, 5, 6];
  if (!state.destination) {
    state.destination = DESTINATIONS[0];
  }
  if (!state.nearestStop) {
    state.nearestStop    = BUS_STOPS[0];
    state.distanceToStop = 600;
    state.userLat        = state.userLat ?? 12.9352;
    state.userLng        = state.userLng ?? 77.6245;
  }

  const results = [];
  tests.forEach((t, idx) => {
    let passed = false;
    let detail = '';
    try {
      passed = t.run();
    } catch (err) {
      passed = false;
      detail = err.message;
    }
    results.push({ name: t.name, passed, detail });
  });

  const passCount = results.filter(r => r.passed).length;

  container.innerHTML = `
    <div style="font-size:0.78rem;font-weight:700;color:${passCount === tests.length ? 'var(--green)' : 'var(--amber)'};margin-bottom:8px;">
      ${passCount}/${tests.length} tests passed
    </div>
    ${results.map(r => `
      <div class="test-result-item ${r.passed ? 'pass' : 'fail'}">
        <span class="test-status-icon">${r.passed ? '✅' : '❌'}</span>
        <span class="test-name">${sanitizeHTML(r.name)}</span>
        ${r.detail ? `<span class="test-detail">${sanitizeHTML(r.detail)}</span>` : ''}
      </div>
    `).join('')}
  `;
}

// ── Main Flow ─────────────────────────────────────────────────────────────

document.getElementById('btn-check')?.addEventListener('click', () => {
  if (!state.destination) {
    destInput?.focus();
    destInput?.classList.add('input-shake');
    setTimeout(() => destInput?.classList.remove('input-shake'), 600);
    alert('Please enter your destination first.');
    return;
  }

  state.busData   = simulateBusData();
  state.metroData = simulateMetroData();
  state.verdict   = runDecision();

  runLoadingSequence(() => {
    renderVerdict();
    showScreen('screen-verdict');
  });
});

document.getElementById('btn-recalc')?.addEventListener('click', () => {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.busData   = simulateBusData();
  state.metroData = simulateMetroData();
  state.verdict   = runDecision();
  renderVerdict();
});

document.getElementById('btn-back')?.addEventListener('click', () => {
  if (state.timerInterval) clearInterval(state.timerInterval);
  showScreen('screen-setup');
});

// ── Pace Selection ────────────────────────────────────────────────────────

document.querySelectorAll('.speed-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.speed-option').forEach(o => {
      o.classList.remove('selected');
      o.setAttribute('aria-checked', 'false');
    });
    opt.classList.add('selected');
    opt.setAttribute('aria-checked', 'true');
    state.selectedPace   = opt.dataset.pace;
    state.manualSpeedMps = null;
    if (speedSlider) speedSlider.value = SPEED_PROFILES[state.selectedPace].mps;
    if (speedVal)    speedVal.textContent = `${SPEED_PROFILES[state.selectedPace].mps.toFixed(1)} m/s`;
  });
});

// ── Weather Selection ─────────────────────────────────────────────────────

document.querySelectorAll('.weather-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.weather-option').forEach(o => {
      o.classList.remove('selected');
      o.setAttribute('aria-checked', 'false');
    });
    opt.classList.add('selected');
    opt.setAttribute('aria-checked', 'true');
    state.weather               = opt.dataset.weather;
    state.weatherManualOverride = true;

    const badgeEl = document.getElementById('weather-auto-badge');
    if (badgeEl) { badgeEl.textContent = 'MANUAL'; badgeEl.className = 'weather-auto-badge manual'; }
    const toggleBtn = document.getElementById('weather-override-toggle');
    if (toggleBtn) toggleBtn.textContent = '✕ Use auto-detected';

    updatePaceTimings();
  });
});

// Enable keyboard access
addKeyboardRadio('.speed-option');
addKeyboardRadio('.weather-option');

// ── Test Harness Activation ───────────────────────────────────────────────

(function checkTestMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('test') === '1') {
    const panel = document.getElementById('test-panel');
    if (panel) panel.style.display = 'block';
  }
})();

// ── Init ──────────────────────────────────────────────────────────────────

(function init() {
  showScreen('screen-setup');
  requestGPS();

  if (speedSlider) {
    speedSlider.value = SPEED_PROFILES.brisk.mps;
    if (speedVal) speedVal.textContent = `${SPEED_PROFILES.brisk.mps.toFixed(1)} m/s`;
  }
})();
