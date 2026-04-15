// ======================================================
// SMART TRANSIT DECISION ENGINE — Core Logic
// PromptWars Hackathon 2026
// ======================================================

// ── Bengaluru Data: Simulated Bus Stops & Routes ──────────────────────────

const BUS_STOPS = [
  { id: 'majestic',      name: 'Majestic Bus Station', lat: 12.9762, lng: 77.5713 },
  { id: 'koramangala',   name: 'Koramangala 5th Block', lat: 12.9352, lng: 77.6245 },
  { id: 'whitefield',    name: 'Whitefield Bus Stop', lat: 12.9698, lng: 77.7500 },
  { id: 'indiranagar',   name: 'Indiranagar 100ft Rd', lat: 12.9719, lng: 77.6412 },
  { id: 'jayanagar',     name: 'Jayanagar 4th Block', lat: 12.9308, lng: 77.5830 },
  { id: 'hebbal',        name: 'Hebbal Flyover Stop', lat: 13.0359, lng: 77.5970 },
  { id: 'btm',           name: 'BTM Layout Stop', lat: 12.9166, lng: 77.6101 },
  { id: 'electronic_city', name: 'Electronic City Phase 1', lat: 12.8451, lng: 77.6601 },
];

const KSRTC_ROUTES = [
  { num: '500C',  name: 'KSRTC 500C', desc: 'Majestic → Electronic City', capacity: 58 },
  { num: '201R',  name: 'KSRTC 201R', desc: 'Koramangala → Majestic via KR Market', capacity: 52 },
  { num: '509',   name: 'KSRTC 509',  desc: 'Hebbal → BTM Layout via Ulsoor', capacity: 58 },
  { num: 'G11',   name: 'BMTC G11',   desc: 'Indiranagar → Whitefield', capacity: 64 },
  { num: '344E',  name: 'KSRTC 344E', desc: 'Jayanagar → Mekhri Circle', capacity: 52 },
];

const METRO_STATIONS = [
  { id: 'mg_road',       name: 'MG Road',        line: 'Green Line',  lat: 12.9756, lng: 77.6099 },
  { id: 'trinity',       name: 'Trinity',         line: 'Green Line',  lat: 12.9763, lng: 77.6166 },
  { id: 'indiranagar',   name: 'Indiranagar',     line: 'Green Line',  lat: 12.9719, lng: 77.6412 },
  { id: 'swami_desikt',  name: 'Swami Vivekananda Rd', line: 'Purple Line', lat: 12.9810, lng: 77.5720 },
  { id: 'majestic_m',   name: 'Sir M Visvesvaraya Terminal', line: 'Purple Line', lat: 12.9782, lng: 77.5712 },
  { id: 'nadaprabhu',   name: 'Nadaprabhu Kempegowda',      line: 'Purple Line', lat: 12.9762, lng: 77.5703 },
  { id: 'mantri_sq',    name: 'Mantri Square Sampige Rd',   line: 'Purple Line', lat: 12.9925, lng: 77.5698 },
];

const DESTINATIONS = [
  { name: 'Majestic Bus Station', lat: 12.9762, lng: 77.5713 },
  { name: 'Koramangala 5th Block', lat: 12.9352, lng: 77.6245 },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7500 },
  { name: 'Electronic City', lat: 12.8451, lng: 77.6601 },
  { name: 'Hebbal', lat: 13.0359, lng: 77.5970 },
  { name: 'Indiranagar 100ft Road', lat: 12.9719, lng: 77.6412 },
  { name: 'BTM Layout', lat: 12.9166, lng: 77.6101 },
  { name: 'Jayanagar 4th Block', lat: 12.9308, lng: 77.5830 },
  { name: 'MG Road', lat: 12.9756, lng: 77.6099 },
  { name: 'Marathahalli', lat: 12.9591, lng: 77.6971 },
  { name: 'Silk Board', lat: 12.9172, lng: 77.6226 },
  { name: 'Yeshwanthpur', lat: 13.0218, lng: 77.5510 },
];

// ── Walking Speed Profiles ────────────────────────────────────────────────

const SPEED_PROFILES = {
  casual: { label: 'Casual Walk', emoji: '🚶', mps: 1.1, displayMph: '~4 km/h' },
  brisk:  { label: 'Brisk Walk',  emoji: '🚶‍♂️', mps: 1.5, displayMph: '~5.5 km/h' },
  jog:    { label: 'Jogging',     emoji: '🏃', mps: 2.6, displayMph: '~9.4 km/h' },
};

// ── Weather Modifiers ─────────────────────────────────────────────────────

const WEATHER = {
  clear: { label: 'Clear',       emoji: '☀️',  penalty: 1.0,  penaltyLabel: 'No penalty' },
  rain:  { label: 'Light Rain',  emoji: '🌧',  penalty: 0.82, penaltyLabel: '−18% speed' },
  heavy: { label: 'Heavy Rain',  emoji: '⛈️',  penalty: 0.62, penaltyLabel: '−38% speed' },
};

// ── Global State ──────────────────────────────────────────────────────────

const state = {
  userLat: null,
  userLng: null,
  gpsAccuracy: null,
  selectedPace: 'brisk',
  manualSpeedMps: null,
  weather: 'clear',
  destination: null,
  nearestStop: null,
  distanceToStop: null,  // meters
  busData: null,
  nextBusData: null,
  metroData: null,
  verdict: null,
  departureTimer: null,
  timerInterval: null,
};

// ── Utility: Haversine Distance (meters) ──────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDist(m) {
  return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatTime(sec) {
  const m = Math.floor(Math.abs(sec) / 60);
  const s = Math.floor(Math.abs(sec) % 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}

function formatMinutes(sec) {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return s > 0 ? `${m} min ${s}s` : `${m} min`;
}

// ── GPS Location ──────────────────────────────────────────────────────────

function requestGPS() {
  const banner = document.getElementById('gps-status-text');
  const coords = document.getElementById('gps-coords');
  const dot = document.querySelector('.gps-dot');

  banner.textContent = 'Requesting location...';
  dot.style.background = 'var(--amber)';

  if (!navigator.geolocation) {
    useFallbackLocation();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLat = pos.coords.latitude;
      state.userLng = pos.coords.longitude;
      state.gpsAccuracy = Math.round(pos.coords.accuracy);

      banner.textContent = 'Location acquired ✓';
      dot.style.background = 'var(--green)';
      coords.textContent = `${state.userLat.toFixed(5)}, ${state.userLng.toFixed(5)}  ±${state.gpsAccuracy}m`;

      findNearestStop();
    },
    (err) => {
      console.warn('GPS error:', err.message);
      useFallbackLocation();
    },
    { timeout: 4000, maximumAge: 60000, enableHighAccuracy: false }
  );
}

function useFallbackLocation() {
  // Default: Koramangala, Bengaluru
  state.userLat = 12.9352 + (Math.random() - 0.5) * 0.008;
  state.userLng = 77.6245 + (Math.random() - 0.5) * 0.008;
  state.gpsAccuracy = 45;

  const banner = document.getElementById('gps-status-text');
  const coords = document.getElementById('gps-coords');
  const dot = document.querySelector('.gps-dot');

  banner.textContent = 'Using simulated location (Bengaluru)';
  dot.style.background = 'var(--amber)';
  coords.textContent = `${state.userLat.toFixed(5)}, ${state.userLng.toFixed(5)}  [simulated]`;

  findNearestStop();
}

function findNearestStop() {
  let nearest = null;
  let nearestDist = Infinity;

  BUS_STOPS.forEach(stop => {
    const d = haversine(state.userLat, state.userLng, stop.lat, stop.lng);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = stop;
    }
  });

  state.nearestStop = nearest;
  // Cap distance at 1500m for a realistic urban walking scenario
  state.distanceToStop = Math.min(nearestDist, 1500);

  const stopEl = document.getElementById('nearest-stop-info');
  if (stopEl) {
    stopEl.textContent = `Nearest stop: ${nearest.name} · ${formatDist(state.distanceToStop)} away`;
  }
}

// ── Data Simulation ───────────────────────────────────────────────────────

function simulateBusData() {
  const route = KSRTC_ROUTES[Math.floor(Math.random() * KSRTC_ROUTES.length)];
  const occupancyPct = Math.round(20 + Math.random() * 65);  // 20–85%

  // Simulate arrival: 2–12 min from now
  const etaSec = Math.round((2 + Math.random() * 10) * 60);

  // Next bus: 8–20 min after current
  const gapSec = Math.round((8 + Math.random() * 12) * 60);
  const nextOccupancy = Math.round(25 + Math.random() * 60);

  return {
    route,
    occupancyPct,
    etaSec,        // seconds until arrival
    nextBus: {
      route,
      occupancyPct: nextOccupancy,
      etaSec: etaSec + gapSec,
    }
  };
}

function simulateMetroData() {
  const station = METRO_STATIONS[Math.floor(Math.random() * METRO_STATIONS.length)];
  const etaSec = Math.round((1 + Math.random() * 8) * 60);
  const nextEta = etaSec + Math.round((3 + Math.random() * 5) * 60);

  // 6 coaches with individual fill levels
  const coaches = Array.from({length: 6}, (_, i) => ({
    num: i + 1,
    pct: Math.round(10 + Math.random() * 80),
  }));

  // Identify least-crowded coach
  const bestCoach = coaches.reduce((a, b) => a.pct < b.pct ? a : b);

  // Platform direction
  const platformEnd = bestCoach.num <= 3 ? 'Front end (Platform Entry)' : 'Rear end (Exit ramp)';

  return { station, etaSec, nextEta, coaches, bestCoach, platformEnd };
}

// ── Decision Engine ───────────────────────────────────────────────────────

function runDecision() {
  const pace = state.selectedPace;
  const baseSpeed = state.manualSpeedMps || SPEED_PROFILES[pace].mps;
  const weatherPenalty = WEATHER[state.weather].penalty;
  const effectiveSpeed = baseSpeed * weatherPenalty;

  const distToStop = state.distanceToStop;
  const walkTimeSec = distToStop / effectiveSpeed;

  const bus = state.busData;
  const metro = state.metroData;

  const canMakeBus = walkTimeSec < bus.etaSec;
  const canMakeMetro = walkTimeSec < metro.etaSec;

  // Comfort score: lower occupancy = better
  const busComfortable = bus.occupancyPct < 70;
  const nextBusComfort  = bus.nextBus.occupancyPct < bus.occupancyPct - 10;
  const waitSaving      = bus.nextBus.etaSec - bus.etaSec;  // how much longer wait is

  // Needed pace to catch the bus
  let neededPace = 'walk';
  const distForWalk  = bus.etaSec * SPEED_PROFILES.casual.mps;
  const distForBrisk = bus.etaSec * SPEED_PROFILES.brisk.mps;
  const distForJog   = bus.etaSec * SPEED_PROFILES.jog.mps;

  if (distToStop > distForBrisk) neededPace = 'jog';
  else if (distToStop > distForWalk) neededPace = 'brisk';

  // Time remaining before you MUST leave (clamped to > 0)
  const mustLeaveIn = Math.max(bus.etaSec - walkTimeSec, 5);

  // Main verdict logic
  let verdictType, verdictText, verdictSub, verdictEmoji;

  if (canMakeBus) {
    if (busComfortable || !nextBusComfort || waitSaving > 10 * 60) {
      // Catch this bus
      verdictType = 'go';
      verdictEmoji = neededPace === 'jog' ? '🏃' : neededPace === 'brisk' ? '🚶‍♂️' : '✅';
      verdictText = neededPace === 'jog'   ? 'LEAVE NOW — JOG!'
                  : neededPace === 'brisk' ? 'LEAVE NOW — BRISK WALK'
                  : 'LEAVE NOW — WALK';
      verdictSub = `You have ${formatMinutes(mustLeaveIn)} before you must step out`;
    } else {
      // Bus too full, next is better and nearby
      verdictType = 'wait';
      verdictEmoji = '😌';
      verdictText = 'WAIT — NEXT IS BETTER';
      verdictSub = `Current bus is ${bus.occupancyPct}% full · Next in ${Math.round(bus.nextBus.etaSec/60)} min at ${bus.nextBus.occupancyPct}%`;
    }
  } else {
    // Can't make this bus
    verdictType = 'wait';
    verdictEmoji = '⏳';
    verdictText  = "CAN'T MAKE IT";
    verdictSub = `Next bus arrives in ${Math.round(bus.nextBus.etaSec / 60)} min — you have time`;
  }

  // Destination ETA (walk + bus journey simulation)
  const journeyMinutes = Math.round(10 + Math.random() * 25);
  const destEta = new Date(Date.now() + (bus.etaSec + journeyMinutes * 60) * 1000);
  const destEtaStr = destEta.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    verdictType, verdictText, verdictSub, verdictEmoji,
    neededPace, mustLeaveIn, canMakeBus, canMakeMetro,
    effectiveSpeed, walkTimeSec, destEtaStr, journeyMinutes,
  };
}

// ── Render Verdict Screen ─────────────────────────────────────────────────

function renderVerdict() {
  const v = state.verdict;
  const bus  = state.busData;
  const metro = state.metroData;

  // Verdict Banner
  const banner = document.getElementById('verdict-banner');
  banner.className = `verdict-banner ${v.verdictType}`;
  document.getElementById('verdict-emoji').textContent = v.verdictEmoji;
  document.getElementById('verdict-text').textContent  = v.verdictText;
  document.getElementById('verdict-sub').textContent   = v.verdictSub;

  // Departure timer color
  const timerEl    = document.getElementById('timer-display');
  const timerDesc  = document.getElementById('timer-desc');
  const paceBadge  = document.getElementById('pace-badge');

  if (v.verdictType === 'go') {
    timerEl.style.color = v.neededPace === 'jog' ? 'var(--red)' : v.neededPace === 'brisk' ? 'var(--amber)' : 'var(--green)';
    timerDesc.textContent = 'until you must leave';
    paceBadge.textContent = `${SPEED_PROFILES[v.neededPace].emoji} ${SPEED_PROFILES[v.neededPace].label}`;
    paceBadge.className = `pace-badge ${v.neededPace}`;
  } else {
    timerEl.style.color = 'var(--blue)';
    timerDesc.textContent = 'until next bus arrives';
    paceBadge.textContent = '😌 Relax — no rush';
    paceBadge.className = 'pace-badge walk';
  }

  // Start countdown
  startCountdown(v.verdictType === 'go' ? v.mustLeaveIn : bus.nextBus.etaSec);

  // PRIMARY BUS CARD
  renderBusCard('primary', bus, v);

  // SECONDARY BUS CARD (next bus)
  renderBusCard('secondary', bus.nextBus, null);

  // METRO CARD
  renderMetroCard(metro);
}

function renderBusCard(type, data, v) {
  const isNext = type === 'secondary';
  const route  = data.route;

  const occ = data.occupancyPct;
  const occClass = occ < 50 ? 'low' : occ < 75 ? 'mid' : 'high';
  const occColor = occ < 50 ? 'var(--green)' : occ < 75 ? 'var(--amber)' : 'var(--red)';
  const occLabel = occ < 50 ? '🟢 Comfortable' : occ < 75 ? '🟡 Moderate' : '🔴 Crowded';

  const etaMin = Math.round(data.etaSec / 60);
  const etaSec = data.etaSec % 60;

  const destStr = v ? v.destEtaStr : '—';
  const walkStr = v ? formatMinutes(v.walkTimeSec) : '—';

  const el = document.getElementById(`bus-card-${type}`);
  el.innerHTML = `
    <div class="transit-header">
      <div class="transit-icon-wrap bus">🚌</div>
      <div class="transit-name">
        <div class="route-num">${route.num}</div>
        <div class="route-sub">${route.desc}</div>
      </div>
      <div class="transit-eta">
        <div class="eta-val">${etaMin}<span style="font-size:0.6em">m ${etaSec}s</span></div>
        <div class="eta-unit">ETA</div>
      </div>
    </div>

    <div class="occupancy-row">
      <div class="occ-header">
        <span class="occ-label">Occupancy — ${occLabel}</span>
        <span class="occ-val" style="color:${occColor}">${occ}%</span>
      </div>
      <div class="occ-bar">
        <div class="occ-fill ${occClass}" id="occ-fill-${type}" style="width:0%"></div>
      </div>
    </div>

    <div class="transit-details">
      <div class="detail-item">
        <div class="d-label">Capacity</div>
        <div class="d-val">${Math.round(occ/100 * route.capacity)} / ${route.capacity} seats</div>
      </div>
      <div class="detail-item">
        <div class="d-label">Walk to stop</div>
        <div class="d-val">${walkStr}</div>
      </div>
      <div class="detail-item">
        <div class="d-label">Stop</div>
        <div class="d-val">${state.nearestStop.name.split(' ').slice(0,2).join(' ')}</div>
      </div>
      <div class="detail-item">
        <div class="d-label">Arrive at dest.</div>
        <div class="d-val">${destStr}</div>
      </div>
    </div>
  `;

  // Animate occupancy bar after short delay
  setTimeout(() => {
    const fill = document.getElementById(`occ-fill-${type}`);
    if (fill) fill.style.width = `${occ}%`;
  }, 300);
}

function renderMetroCard(metro) {
  const etaMin = Math.round(metro.etaSec / 60);
  const etaSec = metro.etaSec % 60;
  const bestC  = metro.bestCoach;

  const el = document.getElementById('metro-card');
  el.innerHTML = `
    <div class="transit-header">
      <div class="transit-icon-wrap metro">🚇</div>
      <div class="transit-name">
        <div class="route-num">${metro.station.line}</div>
        <div class="route-sub">Nearest: ${metro.station.name}</div>
      </div>
      <div class="transit-eta">
        <div class="eta-val" style="color:var(--purple)">${etaMin}<span style="font-size:0.6em">m ${etaSec}s</span></div>
        <div class="eta-unit">ETA</div>
      </div>
    </div>

    <div class="coach-section">
      <div class="coach-label">🚃 Coach fill — Board Coach ${bestC.num} (${bestC.pct}% full ★)</div>
      <div class="coach-map" id="coach-map">
        ${metro.coaches.map(c => {
          const isBest = c.num === bestC.num;
          const fillColor = c.pct < 50 ? 'var(--green)' : c.pct < 75 ? 'var(--amber)' : 'var(--red)';
          return `
            <div class="coach-item ${isBest ? 'best-coach' : ''}">
              <div class="coach-num">C${c.num}</div>
              <div class="coach-fill-bar">
                <div class="coach-fill-inner"
                    id="coach-fill-${c.num}"
                    style="height:0%; background:${fillColor}">
                </div>
              </div>
              <div class="coach-pct">${c.pct}%</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="platform-hint">
        <span>📍</span>
        <span>Stand at <strong>${metro.platformEnd}</strong> for Coach ${bestC.num}</span>
      </div>
    </div>
  `;

  // Animate coach bars
  setTimeout(() => {
    metro.coaches.forEach(c => {
      const el = document.getElementById(`coach-fill-${c.num}`);
      if (el) el.style.height = `${c.pct}%`;
    });
  }, 400);
}

// ── Timer Countdown ───────────────────────────────────────────────────────

function startCountdown(initialSec) {
  let remaining = initialSec;
  const timerEl = document.getElementById('timer-display');

  if (state.timerInterval) clearInterval(state.timerInterval);

  function tick() {
    remaining--;
    timerEl.textContent = formatTime(remaining);

    // Recalculate pace recommendation if going
    if (state.verdict.verdictType === 'go') {
      const pace = getPaceForTime(remaining);
      const badge = document.getElementById('pace-badge');
      if (pace !== state.verdict.neededPace) {
        state.verdict.neededPace = pace;
        timerEl.style.color = pace === 'jog' ? 'var(--red)' : pace === 'brisk' ? 'var(--amber)' : 'var(--green)';
        badge.textContent = `${SPEED_PROFILES[pace].emoji} ${SPEED_PROFILES[pace].label}`;
        badge.className   = `pace-badge ${pace}`;
      }
    }

    if (remaining <= 0) {
      clearInterval(state.timerInterval);
      timerEl.textContent = '0:00';
      if (state.verdict.verdictType === 'go') {
        document.getElementById('verdict-text').textContent = "GO NOW! 🚨";
      }
    }
  }

  timerEl.textContent = formatTime(remaining);
  state.timerInterval = setInterval(tick, 1000);
}

function getPaceForTime(secRemaining) {
  const dist = state.distanceToStop;
  const penalty = WEATHER[state.weather].penalty;
  if (secRemaining <= 0) return 'jog';
  const needed = dist / secRemaining;
  const casualEff = SPEED_PROFILES.casual.mps * penalty;
  const briskEff  = SPEED_PROFILES.brisk.mps  * penalty;
  if (needed <= casualEff) return 'walk';
  if (needed <= briskEff)  return 'brisk';
  return 'jog';
}

// ── Screen Navigation ─────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
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

  // Populate steps
  const container = document.getElementById('loading-steps');
  container.innerHTML = steps.map(s =>
    `<div class="loading-step" id="${s.id}">
       <span class="step-icon"></span>
       <span>${s.text}</span>
       <div class="step-spinner"></div>
     </div>`
  ).join('');

  let i = 0;
  function nextStep() {
    if (i > 0) {
      const prev = document.getElementById(steps[i-1].id);
      prev.classList.add('done');
    }
    if (i < steps.length) {
      const cur = document.getElementById(steps[i].id);
      cur.classList.add('visible');
      i++;
      setTimeout(nextStep, 420 + Math.random() * 280);
    } else {
      // Mark last step done
      const last = document.getElementById(steps[steps.length-1].id);
      last.classList.add('done');
      setTimeout(cb, 400);
    }
  }
  nextStep();
}

// ── Destination Autocomplete ──────────────────────────────────────────────

const destInput = document.getElementById('destination-input');
const suggestions = document.getElementById('dest-suggestions');

destInput?.addEventListener('input', () => {
  const q = destInput.value.trim().toLowerCase();
  if (q.length < 1) { suggestions.style.display = 'none'; return; }

  const matches = DESTINATIONS.filter(d => d.name.toLowerCase().includes(q));
  if (matches.length === 0) { suggestions.style.display = 'none'; return; }

  suggestions.innerHTML = matches.slice(0, 6).map(d => `
    <div class="dest-suggestion-item" onclick="selectDestination('${d.name}', ${d.lat}, ${d.lng})">
      <span class="sugg-icon">📍</span>
      <div class="sugg-info">
        <div class="sugg-name">${d.name}</div>
        <div class="sugg-dist">${state.userLat ? formatDist(haversine(state.userLat, state.userLng, d.lat, d.lng)) + ' from you' : 'Bengaluru'}</div>
      </div>
    </div>
  `).join('');
  suggestions.style.display = 'block';
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.dest-input-wrap')) suggestions.style.display = 'none';
});

function selectDestination(name, lat, lng) {
  state.destination = { name, lat, lng };
  destInput.value = name;
  suggestions.style.display = 'none';
}

// ── Walk Speed Slider ─────────────────────────────────────────────────────

const speedSlider = document.getElementById('speed-slider');
const speedVal    = document.getElementById('speed-val-display');

speedSlider?.addEventListener('input', () => {
  const v = parseFloat(speedSlider.value);
  state.manualSpeedMps = v;
  speedVal.textContent = `${v.toFixed(1)} m/s`;
});

// ── Main Flow ─────────────────────────────────────────────────────────────

document.getElementById('btn-check')?.addEventListener('click', () => {
  if (!state.destination) {
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
    document.querySelectorAll('.speed-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    state.selectedPace = opt.dataset.pace;
    // Reset manual speed when switching preset
    state.manualSpeedMps = null;
    if (speedSlider) speedSlider.value = SPEED_PROFILES[state.selectedPace].mps;
    if (speedVal) speedVal.textContent = `${SPEED_PROFILES[state.selectedPace].mps.toFixed(1)} m/s`;
  });
});

// ── Weather Selection ─────────────────────────────────────────────────────

document.querySelectorAll('.weather-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.weather-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    state.weather = opt.dataset.weather;
  });
});

// ── Init ──────────────────────────────────────────────────────────────────

(function init() {
  showScreen('screen-setup');
  requestGPS();

  // Set default slider value
  if (speedSlider) {
    speedSlider.value = SPEED_PROFILES.brisk.mps;
    speedVal.textContent = `${SPEED_PROFILES.brisk.mps.toFixed(1)} m/s`;
  }
})();
