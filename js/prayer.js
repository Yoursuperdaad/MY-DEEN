/* ============================================
   prayer.js — Prayer times & tracker
   Author: Khalid (reallanex)
   ============================================ */

const Prayer = (() => {
  const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const STORAGE_KEY = "reallanex-prayers";
  let coords = null;
  let times = null;
  let initialized = false;

  /* ---------- Storage ---------- */
  function getLog() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  }
  function saveLog(log) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  }
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  /* ---------- Geolocation ---------- */
  function detectLocation() {
    if (!navigator.geolocation) {
      App.toast("Geolocation not supported");
      return;
    }
    document.getElementById("locationLabel").textContent = "Detecting…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem("reallanex-coords", JSON.stringify(coords));
        fetchTimes();
      },
      () => {
        App.toast("Location denied — using Makkah");
        coords = { lat: 21.4225, lng: 39.8262 };
        fetchTimes();
      },
      { timeout: 8000 },
    );
  }

  /* ---------- Fetch prayer times (AlAdhan API) ---------- */
  async function fetchTimes() {
    if (!coords) return;
    const d = new Date();
    const dateStr = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${coords.lat}&longitude=${coords.lng}&method=2`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      times = json.data.timings;
      document.getElementById("locationLabel").textContent =
        `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`;
      renderTimes();
      renderTracker();
      updateProgress();
    } catch {
      App.toast("Could not load prayer times");
    }
  }

  /* ---------- Render ---------- */
  function renderTimes() {
    const list = document.getElementById("prayerList");
    list.innerHTML = "";
    if (!times) return;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    PRAYERS.forEach((name) => {
      const t = times[name]; // "HH:MM"
      const [h, m] = t.split(":").map(Number);
      const pMin = h * 60 + m;
      const isNext =
        pMin >= nowMin &&
        !PRAYERS.some((p) => {
          const [ph, pm] = times[p].split(":").map(Number);
          const ppMin = ph * 60 + pm;
          return ppMin > nowMin && ppMin < pMin;
        });

      const div = document.createElement("div");
      div.className = `prayer-item${isNext ? " next" : ""}`;
      div.innerHTML = `
        <div>
          <div class="prayer-name">${name}</div>
          <div class="prayer-time">${formatTime(t)}</div>
        </div>
        <div style="font-size:1.3rem">${iconFor(name)}</div>
      `;
      list.appendChild(div);
    });
  }

  function iconFor(name) {
    return (
      { Fajr: "🌅", Dhuhr: "☀️", Asr: "🌤️", Maghrib: "🌇", Isha: "🌙" }[name] ||
      "🕌"
    );
  }

  function formatTime(t) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  /* ---------- Tracker ---------- */
  function renderTracker() {
    const container = document.getElementById("prayerTracker");
    const log = getLog();
    const key = todayKey();
    const done = log[key] || {};

    container.innerHTML = "";
    PRAYERS.forEach((name) => {
      const btn = document.createElement("button");
      btn.className = `track-btn${done[name] ? " done" : ""}`;
      btn.innerHTML = done[name]
        ? ""
        : `${iconFor(name)}<small>${name}</small>`;
      btn.addEventListener("click", () => {
        const l = getLog();
        if (!l[key]) l[key] = {};
        l[key][name] = !l[key][name];
        saveLog(l);
        renderTracker();
        updateProgress();
        updateStats();
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
    const circumference = 2 * Math.PI * 52;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
        document.getElementById('progressText').textContent = `${pct}%`;

    // Refresh the yearly heatmap too
    renderYearly();
  }

  function updateStats() {
    const log = getLog();
    const key = todayKey();
    const done = log[key] || {};
    const count = PRAYERS.filter((p) => done[p]).length;
    document.getElementById("prayersDone").textContent = `${count}/5`;

    // Streak
    let streak = 0;
    const d = new Date();
    while (true) {
      const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const dayLog = log[k];
      if (dayLog && PRAYERS.some((p) => dayLog[p])) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    document.getElementById("streakDays").textContent = streak;
  }
  /* ---------- Yearly heatmap ---------- */
  function renderYearly() {
    const log = getLog();
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- Build count map for the year ---
    const counts = {};
    let totalPrayers = 0;
    let activeDays = 0;

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

    // --- Best streak ---
    let bestStreak = 0,
      current = 0;
    const ds = new Date(start);
    while (ds <= end) {
      const key = `${ds.getFullYear()}-${ds.getMonth() + 1}-${ds.getDate()}`;
      if (counts[key]) {
        current++;
        bestStreak = Math.max(bestStreak, current);
      } else current = 0;
      ds.setDate(ds.getDate() + 1);
    }

    // --- Update stat cards ---
    document.getElementById("yearTotalPrayers").textContent = totalPrayers;
    document.getElementById("yearDays").textContent = activeDays;
    document.getElementById("yearBestStreak").textContent = bestStreak;
    const possibleDays = Math.ceil((today - start) / 86400000) + 1;
    const pct = Math.round((totalPrayers / (possibleDays * 5)) * 100);
    document.getElementById("yearPercent").textContent = `${pct}%`;

    // --- Build the heatmap grid ---
    const heatmap = document.getElementById("heatmap");
    heatmap.innerHTML = "";

    // Start grid on the Sunday on/before Jan 1
    const firstDow = start.getDay(); // 0 = Sun
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - firstDow);

    const totalCells = 53 * 7; // 53 weeks x 7 days
    const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

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
        if (key === todayKey) cell.classList.add("today");
        if (cellDate > today) cell.classList.add("future");

        const niceDate = cellDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        cell.title = `${niceDate} — ${c}/5 prayers`;
      }
      heatmap.appendChild(cell);
    }

    // --- Month labels above the grid ---
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
      const weekStart = new Date(gridStart);
      weekStart.setDate(weekStart.getDate() + w * 7);
      for (let m = 0; m < 12; m++) {
        const firstOfMonth = new Date(year, m, 1);
        const diff = Math.floor((firstOfMonth - weekStart) / 86400000);
        if (diff >= 0 && diff < 7) {
          label.textContent = monthNames[m];
          break;
        }
      }
      monthsEl.appendChild(label);
    }
  }

  /* ---------- Init ---------- */
  function init() {
    if (initialized) {
      renderTimes();
      renderTracker();
      updateProgress();
      return;
    }
    initialized = true;

    document
      .getElementById("detectLocation")
      .addEventListener("click", detectLocation);

    const saved = localStorage.getItem("reallanex-coords");
    if (saved) {
      coords = JSON.parse(saved);
      fetchTimes();
    } else detectLocation();

        updateStats();
    renderYearly();
  }

  return { init };
};();
