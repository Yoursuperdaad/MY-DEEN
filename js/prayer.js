/* ============================================
   prayer.js — Fixed-schedule prayer tracker
   v2.4 — Hardcoded time windows
   Author: Khalid (reallanex)

   Fixed windows (wall-clock in chosen tz):
     Fajr    05:22 → 07:00
     Dhuhr   12:43 → 15:40
     Asr     15:50 → 18:40
     Maghrib 18:47 → 19:50
     Isha    19:53 → 05:15 (next day)
   ============================================ */

const Prayer = (() => {
  const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
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
  const MONTH_SHORT = [
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

  const STORAGE_LOG = "reallanex-prayers";
  const STORAGE_TZ = "reallanex-tz";

  /* ---------- THE FIXED SCHEDULE ----------
     start/end are wall-clock times ("HH:MM") in the chosen timezone.
     Isha is the only one whose end time falls on the NEXT day. */
  const FIXED_TIMES = {
    Fajr: { start: "05:22", end: "07:00" },
    Dhuhr: { start: "12:43", end: "15:40" },
    Asr: { start: "15:50", end: "18:40" },
    Maghrib: { start: "18:47", end: "19:50" },
    Isha: { start: "19:53", end: "05:15" }, // ends next day
  };

  /* ---------- State ---------- */
  let timesCache = new Map();
  let currentSubtab = "day";
  let monthCursor = new Date();
  let selectedDayKey = null;
  let lastStateHash = "";
  let initialized = false;

  /* ---------- Storage ---------- */
  const getLog = () => JSON.parse(localStorage.getItem(STORAGE_LOG) || "{}");
  const saveLog = (l) => localStorage.setItem(STORAGE_LOG, JSON.stringify(l));
  const keyFor = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  /* ---------- Effective timezone offset (hours, e.g. 1, 5.5) ---------- */
  function getEffectiveOffset() {
    const mode = localStorage.getItem(STORAGE_TZ) || "auto";
    if (mode === "auto") return -new Date().getTimezoneOffset() / 60;
    const n = parseFloat(mode);
    return isFinite(n) ? n : -new Date().getTimezoneOffset() / 60;
  }

  /* ---------- "Now" as seen at the chosen timezone ---------- */
  function nowAtLocation() {
    // Returns a Date whose getUTC*() components equal the wall-clock
    // time at the target timezone. Never call .getTime() on this — it is
    // a shifted representation, not an absolute instant.
    return new Date(Date.now() + getEffectiveOffset() * 3600000);
  }
  function todayAtLocation() {
    // Same as before, but guaranteed to build a Date whose *local*
    // Y/M/D components match the calendar day at the target timezone.
    const n = nowAtLocation();
    return new Date(
      n.getUTCFullYear(),
      n.getUTCMonth(),
      n.getUTCDate(),
      12,
      0,
      0,
      0,
    );
  }
  function todayKey() {
    return keyFor(todayAtLocation());
  }

  /* ---------- Helpers ---------- */
  function parseHM(s) {
    const [h, m] = s.split(":").map(Number);
    return h + m / 60;
  }

  /** Convert (a calendar date + local-clock hours) into a real Date moment
   *  corresponding to the chosen tz offset. */
  function timeToDate(dateObj, localHours, tzOffset) {
    const utcHours = localHours - tzOffset;
    const utcMidnight = Date.UTC(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      0,
      0,
      0,
      0,
    );
    return new Date(utcMidnight + utcHours * 3600000);
  }

  /* ---------- Build {start,end} Date pairs for one day ---------- */
  function computeTimesFor(dateObj) {
    const tz = getEffectiveOffset();
    const out = {};
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    for (const name of PRAYERS) {
      const { start, end } = FIXED_TIMES[name];
      const startDate = timeToDate(dateObj, parseHM(start), tz);
      // Isha's end falls on the next calendar day
      const endBase = name === "Isha" ? nextDay : dateObj;
      const endDate = timeToDate(endBase, parseHM(end), tz);
      out[name] = { start: startDate, end: endDate };
    }
    return out;
  }

  function getTimes(dateObj) {
    const key = keyFor(dateObj) + "@" + getEffectiveOffset();
    if (timesCache.has(key)) return timesCache.get(key);
    const result = computeTimesFor(dateObj);
    if (timesCache.size > 120) timesCache.clear();
    timesCache.set(key, result);
    return result;
  }
  const clearTimesCache = () => timesCache.clear();

  /* ---------- Migration ---------- */
  function migrate() {
    const log = getLog();
    let dirty = false;
    Object.keys(log).forEach((k) => {
      const day = log[k];
      if (!day || typeof day !== "object") {
        delete log[k];
        dirty = true;
        return;
      }
      Object.keys(day).forEach((p) => {
        if (day[p] !== true) {
          delete day[p];
          dirty = true;
        }
      });
      if (Object.keys(day).length === 0) {
        delete log[k];
        dirty = true;
      }
    });
    if (dirty) saveLog(log);
  }

  /* ---------- Classify every prayer for a given day ----------
     Returns { Fajr: 'done'|'live'|'missed'|'upcoming', ... } */
  function stateForDay(dateObj, nowMs) {
    const times = getTimes(dateObj);
    if (!times) return null;
    const done = getLog()[keyFor(dateObj)] || {};
    const out = {};
    for (const name of PRAYERS) {
      if (done[name] === true) {
        out[name] = "done";
        continue;
      }
      const { start, end } = times[name];
      const s = start.getTime();
      const e = end.getTime();
      if (nowMs < s) out[name] = "upcoming";
      else if (nowMs < e) out[name] = "live";
      else out[name] = "missed";
    }
    return out;
  }

  /* ---------- Mutations ---------- */
  function markPrayer(dateKey, name) {
    const log = getLog();
    if (!log[dateKey]) log[dateKey] = {};
    log[dateKey][name] = true; // ONE-WAY
    saveLog(log);
    refreshAll();
  }

  function refreshAll() {
    renderTracker();
    renderWindowInfo();
    renderClock();
    updateProgress();
    updateStats();
    if (currentSubtab === "month") renderMonthGrid();
    if (selectedDayKey) renderDayDetail(selectedDayKey);
    App.updateHomeStats();
  }

  function handleTap(dateKey, name) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const states = stateForDay(dateObj, Date.now());
    const state = states ? states[name] : null;

    if (state === "done") {
      App.toast(`${name} already marked ✓`);
      return;
    }
    if (state === "missed") {
      App.toast(`${name} window has ended`);
      return;
    }
    if (state === "upcoming") {
      App.toast(`${name} hasn't started yet`);
      return;
    }
    if (state !== "live") {
      App.toast("Cannot mark right now");
      return;
    }

    markPrayer(dateKey, name);
    App.toast(`${name} marked ✓`);
  }

  /* ---------- Formatting ---------- */
  function formatTimeOfDay(date) {
    // `date` is an absolute UTC instant. To display it as wall-clock time
    // at the chosen timezone, shift by the tz offset and read UTC parts.
    const shifted = new Date(date.getTime() + getEffectiveOffset() * 3600000);
    const h = shifted.getUTCHours();
    const m = shifted.getUTCMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  function formatDuration(ms) {
    if (ms <= 0) return "closed";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
  const iconFor = (name) =>
    ({
      Fajr: "fa-cloud-sun",
      Dhuhr: "fa-sun",
      Asr: "fa-cloud-sun",
      Maghrib: "fa-sun",
      Isha: "fa-moon",
    })[name] || "fa-kaaba";

  /* ---------- Live clock ---------- */
  function renderClock() {
    const el = document.getElementById("clockDisplay");
    if (!el) return;
    const n = nowAtLocation();
    const h = n.getUTCHours();
    const m = n.getUTCMinutes();
    const s = n.getUTCSeconds();
    const ampm = h >= 12 ? "PM" : "AM";
    el.textContent = `${h % 12 || 12}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${ampm}`;
    const tz = getEffectiveOffset();
    el.title = `UTC${tz >= 0 ? "+" : ""}${tz}`;
  }

  /* ---------- Which prayer window is currently open? ---------- */
  function getActiveWindow() {
    const nowMs = Date.now();
    const tz = getEffectiveOffset();
    const today = todayAtLocation();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1) Check if yesterday's Isha is still running (spills into today)
    const yTimes = getTimes(yesterday);
    if (yTimes) {
      const isha = yTimes.Isha;
      if (nowMs >= isha.start.getTime() && nowMs < isha.end.getTime()) {
        return {
          label: "Yesterday's Isha",
          prayer: "Isha",
          dateKey: keyFor(yesterday),
          startMs: isha.start.getTime(),
          endMs: isha.end.getTime(),
        };
      }
    }

    // 2) Check today's five windows
    const tTimes = getTimes(today);
    if (!tTimes) return null;
    for (const name of PRAYERS) {
      const w = tTimes[name];
      if (nowMs >= w.start.getTime() && nowMs < w.end.getTime()) {
        return {
          label: name,
          prayer: name,
          dateKey: keyFor(today),
          startMs: w.start.getTime(),
          endMs: w.end.getTime(),
        };
      }
    }
    return null;
  }

  function renderWindowInfo() {
    const el = document.getElementById("windowInfo");
    if (!el) return;
    const info = getActiveWindow();
    if (!info) {
      el.innerHTML = `<i class="fa-solid fa-clock"></i>
         <span class="wi-text">No prayer window open right now</span>
         <span class="countdown">—</span>`;
      return;
    }
    const closing = formatTimeOfDay(new Date(info.endMs));
    el.innerHTML = `
      <i class="fa-solid fa-hourglass-half"></i>
      <span class="wi-text"><strong>${info.label}</strong> window · closes ${closing}</span>
      <span class="countdown">${formatDuration(info.endMs - Date.now())}</span>
    `;
  }

  function updateCountdownOnly() {
    const el = document.querySelector("#windowInfo .countdown");
    if (!el) return;
    const info = getActiveWindow();
    el.textContent = info ? formatDuration(info.endMs - Date.now()) : "—";
  }

  /* ---------- Day view: prayer list ---------- */
  function renderTimes() {
    const list = document.getElementById("prayerList");
    if (!list) return;
    list.innerHTML = "";
    const todayTimes = getTimes(todayAtLocation());
    if (!todayTimes) return;

    const nowMs = Date.now();
    PRAYERS.forEach((name) => {
      const w = todayTimes[name];
      const t = formatTimeOfDay(w.start);
      const isNext =
        w.start.getTime() >= nowMs &&
        !PRAYERS.some(
          (p) =>
            todayTimes[p].start.getTime() > nowMs &&
            todayTimes[p].start.getTime() < w.start.getTime(),
        );

      const div = document.createElement("div");
      div.className = `prayer-item${isNext ? " next" : ""}`;
      div.innerHTML = `
        <div>
          <div class="prayer-name">${name}</div>
          <div class="prayer-time">${t}</div>
        </div>
        <i class="fa-solid ${iconFor(name)} prayer-icon"></i>
      `;
      list.appendChild(div);
    });
  }

  /* ---------- Day view: tracker ---------- */
  function renderTracker() {
    const container = document.getElementById("prayerTracker");
    if (!container) return;
    const today = todayAtLocation();
    const key = keyFor(today);
    const states = stateForDay(today, Date.now());
    container.innerHTML = "";
    if (!states) return;

    PRAYERS.forEach((name) => {
      const state = states[name];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `track-btn ${state}`;
      btn.innerHTML = `<i class="fa-solid ${iconFor(name)}"></i><small>${name}</small>`;
      attachTap(btn, () => handleTap(key, name));
      container.appendChild(btn);
    });
  }

  /* ---------- Ring ---------- */
  function updateProgress() {
    const key = todayKey();
    const day = getLog()[key] || {};
    const count = PRAYERS.filter((p) => day[p] === true).length;
    const pct = Math.round((count / 5) * 100);
    const ring = document.getElementById("ringFill");
    if (ring) {
      const c = 2 * Math.PI * 52;
      ring.style.strokeDasharray = c;
      ring.style.strokeDashoffset = c - (pct / 100) * c;
    }
    const pt = document.getElementById("progressText");
    if (pt) pt.textContent = `${pct}%`;
    renderYearly();
  }

  function updateStats() {
    const day = getLog()[todayKey()] || {};
    const count = PRAYERS.filter((p) => day[p] === true).length;
    const el = document.getElementById("prayersDone");
    if (el) el.textContent = `${count}/5`;
  }

  /* ---------- Month grid ---------- */
  function renderMonthGrid() {
    const grid = document.getElementById("monthGrid");
    const titleEl = document.getElementById("monthTitle");
    if (!grid) return;
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    titleEl.textContent = `${MONTH_NAMES[month]} ${year}`;
    grid.innerHTML = "";

    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const nowMs = Date.now();
    const tKey = todayKey();

    for (let i = 0; i < startDow; i++) {
      const blank = document.createElement("div");
      blank.className = "month-cell empty";
      grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = keyFor(dateObj);
      const states = stateForDay(dateObj, nowMs);
      const doneCount = states
        ? PRAYERS.filter((p) => states[p] === "done").length
        : 0;
      const isToday = key === tKey;
      const isSelected = key === selectedDayKey;

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className =
        `month-cell${doneCount > 0 ? " level-" + doneCount : ""}` +
        `${isToday ? " today" : ""}${isSelected ? " selected" : ""}`;

      const dots = states
        ? PRAYERS.map((p) => {
            const s = states[p];
            const cls = s === "done" ? "done" : s === "missed" ? "missed" : "";
            return `<span class="dot ${cls}"></span>`;
          }).join("")
        : "";

      cell.innerHTML = `
        <span class="month-day-num">${d}</span>
        <span class="month-dots">${dots}</span>
      `;

      attachTap(cell, () => {
        selectedDayKey = key;
        renderMonthGrid();
        renderDayDetail(key);
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
    if (!wrap) return;

    const [y, m, d] = dateKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const nice = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    titleEl.textContent = dateKey === todayKey() ? `Today — ${nice}` : nice;

    const states = stateForDay(dateObj, Date.now());
    btnsEl.innerHTML = "";
    if (!states) return;

    PRAYERS.forEach((name) => {
      const state = states[name];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `day-detail-btn ${state}`;
      btn.innerHTML = `<i class="fa-solid ${iconFor(name)}"></i><span>${name}</span>`;
      attachTap(btn, () => handleTap(dateKey, name));
      btnsEl.appendChild(btn);
    });

    wrap.classList.remove("hidden");
  }

  function hideDayDetail() {
    selectedDayKey = null;
    const el = document.getElementById("dayDetail");
    if (el) el.classList.add("hidden");
    renderMonthGrid();
  }

  function jumpToToday() {
    monthCursor = new Date(todayAtLocation());
    selectedDayKey = todayKey();
    renderMonthGrid();
    renderDayDetail(selectedDayKey);
  }

  /* ---------- Year heatmap ---------- */
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
      const c = PRAYERS.filter((p) => (log[key] || {})[p] === true).length;
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

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set("yearTotalPrayers", totalPrayers);
    set("yearDays", activeDays);
    set("yearBestStreak", bestStreak);
    const possibleDays = Math.ceil((today - start) / 86400000) + 1;
    set(
      "yearPercent",
      `${Math.round((totalPrayers / (possibleDays * 5)) * 100)}%`,
    );

    const heatmap = document.getElementById("heatmap");
    if (!heatmap) return;
    heatmap.innerHTML = "";
    const firstDow = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - firstDow);
    const tKey = todayKey();

    for (let i = 0; i < 53 * 7; i++) {
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
        if (key === tKey) cell.classList.add("today");
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
    if (!monthsEl) return;
    monthsEl.innerHTML = "";
    for (let w = 0; w < 53; w++) {
      const label = document.createElement("div");
      label.className = "heatmap-month-label";
      const ws = new Date(gridStart);
      ws.setDate(ws.getDate() + w * 7);
      for (let m = 0; m < 12; m++) {
        const fom = new Date(year, m, 1);
        const diff = Math.floor((fom - ws) / 86400000);
        if (diff >= 0 && diff < 7) {
          label.textContent = MONTH_SHORT[m];
          break;
        }
      }
      monthsEl.appendChild(label);
    }
  }

  /* ---------- Sub-tabs ---------- */
  function switchSubtab(name) {
    currentSubtab = name;
    document
      .querySelectorAll(".subtab")
      .forEach((b) => b.classList.toggle("active", b.dataset.psub === name));
    document
      .querySelectorAll(".psub-view")
      .forEach((v) => v.classList.toggle("active", v.id === `psub-${name}`));

    if (name === "day") {
      renderTimes();
      renderTracker();
      renderWindowInfo();
      renderClock();
    }
    if (name === "month") renderMonthGrid();
    if (name === "year") renderYearly();
  }

  /* ---------- Tap helper ---------- */
  function attachTap(el, handler) {
    if (window.PointerEvent) {
      let down = null;
      el.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        down = { x: e.clientX, y: e.clientY, t: Date.now() };
      });
      el.addEventListener("pointerup", (e) => {
        if (!down) return;
        const dt = Date.now() - down.t;
        const dx = Math.abs(e.clientX - down.x);
        const dy = Math.abs(e.clientY - down.y);
        down = null;
        if (dt < 700 && dx < 14 && dy < 14) handler(e);
      });
      el.addEventListener("pointercancel", () => {
        down = null;
      });
      el.addEventListener("pointerleave", () => {
        down = null;
      });
    } else {
      el.addEventListener("click", handler);
    }
  }

  /* ---------- Live tick ---------- */
  function tick() {
    renderClock();
    if (!document.getElementById("view-prayer").classList.contains("active"))
      return;
    if (currentSubtab !== "day") return;

    updateCountdownOnly();

    const now = todayAtLocation();
    const states = stateForDay(now, Date.now());
    if (!states) return;
    const hash = PRAYERS.map((p) => states[p]).join("|");
    if (hash !== lastStateHash) {
      lastStateHash = hash;
      renderTracker();
      renderWindowInfo();
    }
  }

  /* ---------- Init ---------- */
  function init() {
    if (!initialized) {
      initialized = true;
      migrate();

      document
        .querySelectorAll(".subtab")
        .forEach((btn) =>
          btn.addEventListener("click", () => switchSubtab(btn.dataset.psub)),
        );

      const prev = document.getElementById("prevMonth");
      if (prev)
        prev.addEventListener("click", () => {
          monthCursor.setMonth(monthCursor.getMonth() - 1);
          selectedDayKey = null;
          const dd = document.getElementById("dayDetail");
          if (dd) dd.classList.add("hidden");
          renderMonthGrid();
        });

      const next = document.getElementById("nextMonth");
      if (next)
        next.addEventListener("click", () => {
          monthCursor.setMonth(monthCursor.getMonth() + 1);
          selectedDayKey = null;
          const dd = document.getElementById("dayDetail");
          if (dd) dd.classList.add("hidden");
          renderMonthGrid();
        });

      const jt = document.getElementById("jumpToday");
      if (jt) jt.addEventListener("click", jumpToToday);

      const cd = document.getElementById("closeDayDetail");
      if (cd) cd.addEventListener("click", hideDayDetail);

      const tzSel = document.getElementById("tzSelect");
      if (tzSel) {
        tzSel.value = localStorage.getItem(STORAGE_TZ) || "auto";
        tzSel.addEventListener("change", () => {
          localStorage.setItem(STORAGE_TZ, tzSel.value);
          clearTimesCache();
          refreshAll();
          renderTimes();
          App.toast("Timezone updated");
        });
      }

      setInterval(tick, 1000);
    }

    renderTimes();
    renderTracker();
    renderWindowInfo();
    renderClock();
    updateProgress();
    updateStats();
    renderYearly();
    if (currentSubtab === "month") renderMonthGrid();
  }

  return { init };
})();
