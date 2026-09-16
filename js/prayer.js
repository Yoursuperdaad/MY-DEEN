/* ============================================
   prayer.js — Offline prayer times & tracker
   Pure math calculation — no internet needed
   Author: Khalid (reallanex)
   ============================================ */

const Prayer = (() => {
  const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const STORAGE_LOG = "reallanex-prayers";
  const STORAGE_COORDS = "reallanex-coords";
  const STORAGE_METHOD = "reallanex-method";
  const STORAGE_ASR = "reallanex-asr";

  const METHODS = {
    MWL: { fajr: 18, isha: 17 },
    ISNA: { fajr: 15, isha: 15 },
    Egypt: { fajr: 19.5, isha: 17.5 },
    Makkah: { fajr: 18.5, isha: 90 /* minutes after maghrib */ },
    Karachi: { fajr: 18, isha: 18 },
  };

  const DEG = Math.PI / 180;
  const dsin = (d) => Math.sin(d * DEG);
  const dcos = (d) => Math.cos(d * DEG);
  const dtan = (d) => Math.tan(d * DEG);
  const darcsin = (x) => Math.asin(x) / DEG;
  const darccos = (x) => Math.acos(x) / DEG;
  const darctan2 = (y, x) => Math.atan2(y, x) / DEG;
  const darccot = (x) => Math.atan(1 / x) / DEG;
  const fixAngle = (a) => a - 360 * Math.floor(a / 360);
  const fixHour = (a) => {
    a = a - 24 * Math.floor(a / 24);
    return a < 0 ? a + 24 : a;
  };

  let coords = null;
  let times = null;
  let initialized = false;

  /* ---------- Storage helpers ---------- */
  const getLog = () => JSON.parse(localStorage.getItem(STORAGE_LOG) || "{}");
  const saveLog = (l) => localStorage.setItem(STORAGE_LOG, JSON.stringify(l));
  const todayKey = (d = new Date()) =>
    `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  /* ---------- Astronomy ---------- */
  function julianDate(y, m, d) {
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return (
      Math.floor(365.25 * (y + 4716)) +
      Math.floor(30.6001 * (m + 1)) +
      d +
      B -
      1524.5
    );
  }

  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = fixAngle(357.529 + 0.98560028 * D);
    const q = fixAngle(280.459 + 0.98564736 * D);
    const L = fixAngle(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
    const eqt = q / 15 - RA;
    const decl = darcsin(dsin(e) * dsin(L));
    return { declination: decl, equation: eqt };
  }

  const midDay = (jd, t) => fixHour(12 - sunPosition(jd + t).equation);

  function sunAngleTime(jd, lat, angle, t, ccw) {
    const decl = sunPosition(jd + t).declination;
    const noon = midDay(jd, t);
    const cosH =
      (-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat));
    const H = darccos(cosH) / 15;
    return noon + (ccw ? -H : H);
  }

  function asrTime(jd, lat, factor, t) {
    const decl = sunPosition(jd + t).declination;
    const angle = -darccot(factor + dtan(Math.abs(lat - decl)));
    return sunAngleTime(jd, lat, angle, t, false);
  }

  function calculate(date, lat, lng, tz, method, asrJuristic) {
    const jd =
      julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate()) -
      lng / (15 * 24);
    const m = METHODS[method] || METHODS.MWL;
    const asrFactor = asrJuristic === "hanafi" ? 2 : 1;

    const fajr = sunAngleTime(jd, lat, m.fajr, 5 / 24, true);
    const sunrise = sunAngleTime(jd, lat, 0.833, 6 / 24, true);
    const dhuhr = midDay(jd, 12 / 24) + 1 / 60;
    const asr = asrTime(jd, lat, asrFactor, 13 / 24);
    const sunset = sunAngleTime(jd, lat, 0.833, 18 / 24, false);
    const maghrib = sunset + 1 / 60;

    let isha;
    if (typeof m.isha === "number" && m.isha > 60) {
      // Makkah method — minutes after maghrib
      isha = maghrib + m.isha / 60;
    } else {
      isha = sunAngleTime(jd, lat, m.isha, 18 / 24, false);
    }

    // Convert UTC to local using browser timezone offset
    const adjust = tz - lng / 15;
    return {
      Fajr: fixHour(fajr + adjust),
      Sunrise: fixHour(sunrise + adjust),
      Dhuhr: fixHour(dhuhr + adjust),
      Asr: fixHour(asr + adjust),
      Maghrib: fixHour(maghrib + adjust),
      Isha: fixHour(isha + adjust),
    };
  }

  function toHHMM(hoursFloat) {
    const total = Math.round(hoursFloat * 60);
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  function formatTime(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  /* ---------- Compute & render ---------- */
  function computeTimes() {
    if (!coords) return null;
    const method = localStorage.getItem(STORAGE_METHOD) || "MWL";
    const asrJ = localStorage.getItem(STORAGE_ASR) || "standard";
    const tz = -new Date().getTimezoneOffset() / 60;

    const raw = calculate(new Date(), coords.lat, coords.lng, tz, method, asrJ);
    const formatted = {};
    Object.keys(raw).forEach((k) => {
      formatted[k] = toHHMM(raw[k]);
    });
    return formatted;
  }

  function refresh() {
    times = computeTimes();
    if (!times) return;
    renderTimes();
    renderTracker();
    updateProgress();
    updateStats();
  }

  function iconFor(name) {
    return (
      {
        Fajr: "fa-cloud-sun",
        Dhuhr: "fa-sun",
        Asr: "fa-cloud-sun",
        Maghrib: "fa-sun",
        Isha: "fa-moon",
      }[name] || "fa-kaaba"
    );
  }

  function renderTimes() {
    const list = document.getElementById("prayerList");
    list.innerHTML = "";
    if (!times) return;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    PRAYERS.forEach((name) => {
      const t = times[name];
      const [h, m] = t.split(":").map(Number);
      const pMin = h * 60 + m;
      const isNext =
        pMin >= nowMin &&
        !PRAYERS.some((p) => {
          const [ph, pm] = times[p].split(":").map(Number);
          const pp = ph * 60 + pm;
          return pp > nowMin && pp < pMin;
        });

      const div = document.createElement("div");
      div.className = `prayer-item${isNext ? " next" : ""}`;
      div.innerHTML = `
        <div>
          <div class="prayer-name">${name}</div>
          <div class="prayer-time">${formatTime(t)}</div>
        </div>
        <i class="fa-solid ${iconFor(name)} prayer-icon"></i>
      `;
      list.appendChild(div);
    });
  }

  function renderTracker() {
    const container = document.getElementById("prayerTracker");
    const log = getLog();
    const key = todayKey();
    const done = log[key] || {};

    container.innerHTML = "";
    PRAYERS.forEach((name) => {
      const btn = document.createElement("button");
      btn.className = `track-btn${done[name] ? " done" : ""}`;
      btn.innerHTML = `<i class="fa-solid ${done[name] ? "fa-check" : iconFor(name)}"></i><small>${name}</small>`;
      btn.addEventListener("click", () => {
        const l = getLog();
        if (!l[key]) l[key] = {};
        l[key][name] = !l[key][name];
        saveLog(l);
        renderTracker();
        updateProgress();
        updateStats();
        App.updateHomeStats();
      });
      container.appendChild(btn);
    });
  }

  function updateProgress() {
    const log = getLog();
    const key = todayKey();
    const done = log[key] || {};
    const count = PRAYERS.filter((p) => done[p]).length;
    const pct = Math.round((count / 5) * 100);
    const ring = document.getElementById("ringFill");
    const c = 2 * Math.PI * 52;
    ring.style.strokeDasharray = c;
    ring.style.strokeDashoffset = c - (pct / 100) * c;
    document.getElementById("progressText").textContent = `${pct}%`;
    renderYearly();
  }

  function updateStats() {
    const log = getLog();
    const done = log[todayKey()] || {};
    const count = PRAYERS.filter((p) => done[p]).length;
    document.getElementById("prayersDone").textContent = `${count}/5`;
  }

  /* ---------- Yearly heatmap ---------- */
  function renderYearly() {
    const log = getLog();
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const counts = {};
    let totalPrayers = 0,
      activeDays = 0;
    const d = new Date(start);
    while (d <= end) {
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const dayLog = log[key] || {};
      const c = PRAYERS.filter((p) => dayLog[p]).length;
      if (c > 0) {
        counts[key] = c;
        totalPrayers += c;
        activeDays++;
      }
      d.setDate(d.getDate() + 1);
    }

    let bestStreak = 0,
      cur = 0;
    const ds = new Date(start);
    while (ds <= end) {
      const key = `${ds.getFullYear()}-${ds.getMonth() + 1}-${ds.getDate()}`;
      if (counts[key]) {
        cur++;
        bestStreak = Math.max(bestStreak, cur);
      } else cur = 0;
      ds.setDate(ds.getDate() + 1);
    }

    document.getElementById("yearTotalPrayers").textContent = totalPrayers;
    document.getElementById("yearDays").textContent = activeDays;
    document.getElementById("yearBestStreak").textContent = bestStreak;
    const possibleDays = Math.ceil((today - start) / 86400000) + 1;
    document.getElementById("yearPercent").textContent =
      `${Math.round((totalPrayers / (possibleDays * 5)) * 100)}%`;

    const heatmap = document.getElementById("heatmap");
    heatmap.innerHTML = "";

    const firstDow = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - firstDow);
    const totalCells = 53 * 7;
    const todayK = todayKey(today);

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(cellDate.getDate() + i);
      const key = `${cellDate.getFullYear()}-${cellDate.getMonth() + 1}-${cellDate.getDate()}`;
      const cell = document.createElement("div");
      cell.className = "heat-cell";

      if (cellDate < start || cellDate > end) {
        cell.classList.add("hidden-cell");
      } else {
        const c = counts[key] || 0;
        if (c > 0) cell.classList.add(`level-${c}`);
        if (key === todayK) cell.classList.add("today");
        if (cellDate > today) cell.classList.add("future");
        const nice = cellDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        cell.title = `${nice} — ${c}/5 prayers`;
      }
      heatmap.appendChild(cell);
    }

    const monthsEl = document.getElementById("heatmapMonths");
    monthsEl.innerHTML = "";
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    for (let w = 0; w < 53; w++) {
      const label = document.createElement("div");
      label.className = "heatmap-month-label";
      const ws = new Date(gridStart);
      ws.setDate(ws.getDate() + w * 7);
      for (let m = 0; m < 12; m++) {
        const fom = new Date(year, m, 1);
        const diff = Math.floor((fom - ws) / 86400000);
        if (diff >= 0 && diff < 7) {
          label.textContent = monthNames[m];
          break;
        }
      }
      monthsEl.appendChild(label);
    }
  }

  /* ---------- Location ---------- */
  function setLocationLabel() {
    if (!coords) {
      document.getElementById("locationLabel").innerHTML =
        '<i class="fa-solid fa-location-dot"></i> Location not set';
      return;
    }
    document.getElementById("locationLabel").innerHTML =
      `<i class="fa-solid fa-location-dot"></i> ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`;
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      App.toast("Geolocation not supported");
      return;
    }
    App.toast("Detecting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem(STORAGE_COORDS, JSON.stringify(coords));
        setLocationLabel();
        refresh();
        App.toast("Location saved ✓");
      },
      () => {
        App.toast("Location denied — set it manually");
        openManualModal();
      },
      { timeout: 10000 },
    );
  }

  function openManualModal() {
    document.getElementById("manualModal").classList.remove("hidden");
  }
  function closeManualModal() {
    document.getElementById("manualModal").classList.add("hidden");
  }

  function saveManualLocation() {
    const lat = parseFloat(document.getElementById("latInput").value);
    const lng = parseFloat(document.getElementById("lngInput").value);
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      App.toast("Invalid coordinates");
      return;
    }
    coords = { lat, lng };
    localStorage.setItem(STORAGE_COORDS, JSON.stringify(coords));
    setLocationLabel();
    closeManualModal();
    refresh();
    App.toast("Location saved ✓");
  }

  /* ---------- Init ---------- */
  function init() {
    if (!initialized) {
      initialized = true;

      document
        .getElementById("detectLocation")
        .addEventListener("click", detectLocation);
      document
        .getElementById("manualLocation")
        .addEventListener("click", openManualModal);
      document
        .getElementById("manualCancel")
        .addEventListener("click", closeManualModal);
      document
        .getElementById("manualSave")
        .addEventListener("click", saveManualLocation);
      document.getElementById("manualModal").addEventListener("click", (e) => {
        if (e.target.id === "manualModal") closeManualModal();
      });

      const methodSel = document.getElementById("methodSelect");
      methodSel.value = localStorage.getItem(STORAGE_METHOD) || "MWL";
      methodSel.addEventListener("change", () => {
        localStorage.setItem(STORAGE_METHOD, methodSel.value);
        refresh();
      });

      const asrSel = document.getElementById("asrSelect");
      asrSel.value = localStorage.getItem(STORAGE_ASR) || "standard";
      asrSel.addEventListener("change", () => {
        localStorage.setItem(STORAGE_ASR, asrSel.value);
        refresh();
      });

      const saved = localStorage.getItem(STORAGE_COORDS);
      if (saved) coords = JSON.parse(saved);
    }

    setLocationLabel();
    if (coords) refresh();
    else renderYearly(); // still show heatmap even without location
  }

  return { init };
})();
