/* ============================================
   prayer.js — Offline prayer times, tracker,
   interactive Month & Year calendar
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
    Makkah: { fajr: 18.5, isha: 90 },
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

  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let coords = null;
  let times = null;
  let initialized = false;
  let currentSubtab = "day";
  let monthCursor = new Date(); // which month the Month view is showing
  let selectedDayKey = null; // for the day-detail panel

  /* ---------- Storage ---------- */
  const getLog = () => JSON.parse(localStorage.getItem(STORAGE_LOG) || "{}");
  const saveLog = (l) => localStorage.setItem(STORAGE_LOG, JSON.stringify(l));
  const keyFor = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const todayKey = (d = new Date()) => keyFor(d);

  const countFor = (dateKey) => {
    const log = getLog();
    const day = log[dateKey] || {};
    return PRAYERS.filter((p) => day[p]).length;
  };

  /* ---------- Central mutation (single source of truth) ---------- */
  function setPrayer(dateKey, prayerName, value) {
    const log = getLog();
    if (!log[dateKey]) log[dateKey] = {};
    log[dateKey][prayerName] = !!value;
    // If all false, remove the day to keep storage tiny
    if (!PRAYERS.some((p) => log[dateKey][p])) delete log[dateKey];
    saveLog(log);

    // Refresh every dependent view (cheap, all synchronous)
    renderTracker(); // Day view buttons
    updateProgress(); // Ring + yearly
    updateStats(); // (home-level counters)
    if (currentSubtab === "month") renderMonthGrid();
    if (selectedDayKey) renderDayDetail(selectedDayKey);
    App.updateHomeStats();
  }

  function togglePrayer(dateKey, prayerName) {
    const log = getLog();
    const current = !!(log[dateKey] && log[dateKey][prayerName]);
    setPrayer(dateKey, prayerName, !current);
  }

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
    if (typeof m.isha === "number" && m.isha > 60) isha = maghrib + m.isha / 60;
    else isha = sunAngleTime(jd, lat, m.isha, 18 / 24, false);
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
  const toHHMM = (h) => {
    const total = Math.round(h * 60);
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
  const formatTime = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  function computeTimes() {
    if (!coords) return null;
    const method = localStorage.getItem(STORAGE_METHOD) || "MWL";
    const asrJ = localStorage.getItem(STORAGE_ASR) || "standard";
    const tz = -new Date().getTimezoneOffset() / 60;
    const raw = calculate(new Date(), coords.lat, coords.lng, tz, method, asrJ);
    const out = {};
    Object.keys(raw).forEach((k) => (out[k] = toHHMM(raw[k])));
    return out;
  }

  function refreshDayView() {
    times = computeTimes();
    if (!times) return;
    renderTimes();
    renderTracker();
    updateProgress();
    updateStats();
  }

  const iconFor = (name) =>
    ({
      Fajr: "fa-cloud-sun",
      Dhuhr: "fa-sun",
      Asr: "fa-cloud-sun",
      Maghrib: "fa-sun",
      Isha: "fa-moon",
    })[name] || "fa-kaaba";

  /* ---------- Day view: prayer times ---------- */
  function renderTimes() {
    const list = document.getElementById("prayerList");
    list.innerHTML = "";
    if (!times) return;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    PRAYERS.forEach((name) => {
      const [h, m] = times[name].split(":").map(Number);
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
          <div class="prayer-time">${formatTime(times[name])}</div>
        </div>
        <i class="fa-solid ${iconFor(name)} prayer-icon"></i>
      `;
      list.appendChild(div);
    });
  }

  /* ---------- Day view: today's tracker (pointer-safe) ---------- */
  function renderTracker() {
    const container = document.getElementById("prayerTracker");
    const key = todayKey();
    const day = getLog()[key] || {};

    container.innerHTML = "";
    PRAYERS.forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isDone = !!day[name];
      btn.className = `track-btn${isDone ? " done" : ""}`;
      btn.innerHTML = `<i class="fa-solid ${isDone ? "fa-check" : iconFor(name)}"></i><small>${name}</small>`;
      attachTap(btn, () => togglePrayer(key, name));
      container.appendChild(btn);
    });
  }

  /* ---------- Ring ---------- */
  function updateProgress() {
    const key = todayKey();
    const day = getLog()[key] || {};
    const count = PRAYERS.filter((p) => day[p]).length;
    const pct = Math.round((count / 5) * 100);
    const ring = document.getElementById("ringFill");
    const c = 2 * Math.PI * 52;
    ring.style.strokeDasharray = c;
    ring.style.strokeDashoffset = c - (pct / 100) * c;
    document.getElementById("progressText").textContent = `${pct}%`;
    renderYearly();
  }

  function updateStats() {
    const day = getLog()[todayKey()] || {};
    const count = PRAYERS.filter((p) => day[p]).length;
    document.getElementById("prayersDone").textContent = `${count}/5`;
  }

  /* ---------- Month view ---------- */
  function renderMonthGrid() {
    const grid = document.getElementById("monthGrid");
    const titleEl = document.getElementById("monthTitle");
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();

    titleEl.textContent = `${MONTH_NAMES[month]} ${year}`;
    grid.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const startDow = firstDay.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Leading blanks
    for (let i = 0; i < startDow; i++) {
      const blank = document.createElement("div");
      blank.className = "month-cell empty";
      grid.appendChild(blank);
    }

    const todayK = todayKey();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = keyFor(dateObj);
      const count = countFor(key);
      const isToday = key === todayK;
      const isFuture = dateObj > now;
      const isSelected = key === selectedDayKey;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `month-cell${count > 0 ? " level-" + count : ""}${
        isToday ? " today" : ""
      }${isFuture ? " future" : ""}${isSelected ? " selected" : ""}`;
      cell.dataset.date = key;

      // 5 dots
      const day = getLog()[key] || {};
      const dotsHtml = PRAYERS.map(
        (p) => `<span class="dot${day[p] ? " done" : ""}"></span>`,
      ).join("");

      cell.innerHTML = `
        <span class="month-day-num">${d}</span>
        <span class="month-dots">${dotsHtml}</span>
      `;

      // Tap to select day & open detail panel
      attachTap(cell, () => {
        selectedDayKey = key;
        renderMonthGrid();
        renderDayDetail(key);
        // Scroll detail into view
        setTimeout(() => {
          document
            .getElementById("dayDetail")
            .scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 60);
      });

      grid.appendChild(cell);
    }
  }

  function renderDayDetail(dateKey) {
    const wrap = document.getElementById("dayDetail");
    const titleEl = document.getElementById("dayDetailTitle");
    const btnsEl = document.getElementById("dayDetailBtns");

    // parse key: Y-M-D
    const [y, m, d] = dateKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const nice = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const isToday = dateKey === todayKey();
    titleEl.textContent = isToday ? `Today — ${nice}` : nice;

    btnsEl.innerHTML = "";
    const day = getLog()[dateKey] || {};

    PRAYERS.forEach((name) => {
      const isDone = !!day[name];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `day-detail-btn${isDone ? " done" : ""}`;
      btn.innerHTML = `<i class="fa-solid ${isDone ? "fa-check" : iconFor(name)}"></i><span>${name}</span>`;
      attachTap(btn, () => togglePrayer(dateKey, name));
      btnsEl.appendChild(btn);
    });

    wrap.classList.remove("hidden");
  }

  function hideDayDetail() {
    selectedDayKey = null;
    document.getElementById("dayDetail").classList.add("hidden");
    renderMonthGrid();
  }

  function jumpToToday() {
    monthCursor = new Date();
    selectedDayKey = todayKey();
    renderMonthGrid();
    renderDayDetail(selectedDayKey);
  }

  /* ---------- Year view (heatmap) ---------- */
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
      const key = keyFor(d);
      const c = PRAYERS.filter((p) => (log[key] || {})[p]).length;
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
      const key = keyFor(ds);
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
    const todayK = todayKey();

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(cellDate.getDate() + i);
      const key = keyFor(cellDate);
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
    const monthShort = [
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
          label.textContent = monthShort[m];
          break;
        }
      }
      monthsEl.appendChild(label);
    }
  }

  /* ---------- Location ---------- */
  function setLocationLabel() {
    const el = document.getElementById("locationLabel");
    if (!coords) {
      el.innerHTML =
        '<i class="fa-solid fa-location-dot"></i> Location not set';
      return;
    }
    el.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`;
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
        refreshDayView();
        App.toast("Location saved ✓");
      },
      () => {
        App.toast("Location denied — set it manually");
        openManualModal();
      },
      { timeout: 10000 },
    );
  }

  const openManualModal = () =>
    document.getElementById("manualModal").classList.remove("hidden");
  const closeManualModal = () =>
    document.getElementById("manualModal").classList.add("hidden");

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
    refreshDayView();
    App.toast("Location saved ✓");
  }

  /* ---------- Sub-tab switching ---------- */
  function switchSubtab(name) {
    currentSubtab = name;
    document
      .querySelectorAll(".subtab")
      .forEach((b) => b.classList.toggle("active", b.dataset.psub === name));
    document
      .querySelectorAll(".psub-view")
      .forEach((v) => v.classList.toggle("active", v.id === `psub-${name}`));

    if (name === "day") refreshDayView();
    if (name === "month") renderMonthGrid();
    if (name === "year") renderYearly();
  }

  /* ---------- Universal tap helper (fixes mobile) ----------
     Uses pointerdown so touch registers instantly.
     Debounces rapid double-fires between pointerdown & click. */
  function attachTap(el, handler) {
    let lastFire = 0;
    const fire = (e) => {
      if (e && e.cancelable) e.preventDefault();
      const now = Date.now();
      if (now - lastFire < 300) return;
      lastFire = now;
      handler(e);
    };
    el.addEventListener("pointerdown", fire);
    // Fallback for very old browsers without pointer events
    if (!window.PointerEvent) {
      el.addEventListener("touchstart", fire, { passive: false });
      el.addEventListener("mousedown", fire);
    }
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

      // Sub-tab switching
      document.querySelectorAll(".subtab").forEach((btn) => {
        btn.addEventListener("click", () => switchSubtab(btn.dataset.psub));
      });

      // Month navigation
      document.getElementById("prevMonth").addEventListener("click", () => {
        monthCursor.setMonth(monthCursor.getMonth() - 1);
        selectedDayKey = null;
        document.getElementById("dayDetail").classList.add("hidden");
        renderMonthGrid();
      });
      document.getElementById("nextMonth").addEventListener("click", () => {
        monthCursor.setMonth(monthCursor.getMonth() + 1);
        selectedDayKey = null;
        document.getElementById("dayDetail").classList.add("hidden");
        renderMonthGrid();
      });
      document
        .getElementById("jumpToday")
        .addEventListener("click", jumpToToday);
      document
        .getElementById("closeDayDetail")
        .addEventListener("click", hideDayDetail);

      // Method / Asr selectors
      const methodSel = document.getElementById("methodSelect");
      methodSel.value = localStorage.getItem(STORAGE_METHOD) || "MWL";
      methodSel.addEventListener("change", () => {
        localStorage.setItem(STORAGE_METHOD, methodSel.value);
        refreshDayView();
      });

      const asrSel = document.getElementById("asrSelect");
      asrSel.value = localStorage.getItem(STORAGE_ASR) || "standard";
      asrSel.addEventListener("change", () => {
        localStorage.setItem(STORAGE_ASR, asrSel.value);
        refreshDayView();
      });

      const saved = localStorage.getItem(STORAGE_COORDS);
      if (saved) coords = JSON.parse(saved);
    }

    setLocationLabel();
    if (coords) refreshDayView();
    else {
      renderTracker();
      updateProgress();
      updateStats();
    }
    renderYearly();
    if (currentSubtab === "month") renderMonthGrid();
  }

  return { init };
})();
