/* ============================================
   app.js — Core, install prompt, motivation
   Author: Khalid (reallanex)
   ============================================ */

const App = (() => {
  const state = {
    theme: localStorage.getItem("reallanex-theme") || "light",
  };

  /* ---------- Daily motivation (fully offline, embedded) ---------- */
  const MOTIVATIONS = [
    {
      ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
      en: "Indeed, with hardship comes ease.",
      ref: "Quran 94:6",
    },
    {
      ar: "وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ",
      en: "And remember your Lord when you forget.",
      ref: "Quran 18:24",
    },
    {
      ar: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
      en: "Verily, in the remembrance of Allah do hearts find rest.",
      ref: "Quran 13:28",
    },
    {
      ar: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
      en: "And whoever relies upon Allah — then He is sufficient for him.",
      ref: "Quran 65:3",
    },
    {
      ar: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
      en: "Indeed, Allah is with the patient.",
      ref: "Quran 2:153",
    },
    {
      ar: "فَاذْكُرُونِي أَذْكُرْكُمْ",
      en: "So remember Me; I will remember you.",
      ref: "Quran 2:152",
    },
    {
      ar: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
      en: "And say: My Lord, increase me in knowledge.",
      ref: "Quran 20:114",
    },
    {
      ar: "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا",
      en: "Indeed, prayer has been decreed upon the believers at specified times.",
      ref: "Quran 4:103",
    },
    {
      ar: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ",
      en: "And your Lord is going to give you, and you will be satisfied.",
      ref: "Quran 93:5",
    },
    {
      ar: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
      en: "Allah does not burden a soul beyond that it can bear.",
      ref: "Quran 2:286",
    },
    {
      ar: "وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ",
      en: "Perhaps you dislike a thing and it is good for you.",
      ref: "Quran 2:216",
    },
    {
      ar: "إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ",
      en: "Allah will not change a people until they change themselves.",
      ref: "Quran 13:11",
    },
    {
      ar: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ",
      en: "And He is with you wherever you are.",
      ref: "Quran 57:4",
    },
    {
      ar: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً",
      en: "Our Lord, give us good in this world and good in the Hereafter.",
      ref: "Quran 2:201",
    },
    {
      ar: "وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
      en: "Be patient — Allah does not waste the reward of the doers of good.",
      ref: "Quran 11:115",
    },
  ];

  /* ---------- Splash ---------- */
  function hideSplash() {
    setTimeout(
      () => document.getElementById("splash").classList.add("hide"),
      1500,
    );
  }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = document.querySelector("#themeToggle i");
    icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    localStorage.setItem("reallanex-theme", theme);
    state.theme = theme;
  }
  function toggleTheme() {
    applyTheme(state.theme === "light" ? "dark" : "light");
  }

  /* ---------- Navigation ---------- */
  function switchView(view) {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document.getElementById(`view-${view}`).classList.add("active");
    document.querySelector(`.tab[data-view="${view}"]`).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (view === "prayer") Prayer.init();
    if (view === "quran") Quran.init();
    if (view === "names") Names.init();
    if (view === "tasbih") Tasbih.init();
    if (view === "home") updateHomeStats();
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- Motivation ---------- */
  function loadMotivation() {
    const m = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    document.getElementById("motivationArabic").textContent = m.ar;
    document.getElementById("motivationText").textContent = m.en;
    document.getElementById("motivationRef").textContent = "— " + m.ref;
  }

  /* ---------- Home stats ---------- */
  function updateHomeStats() {
    // Prayers today
    const log = JSON.parse(localStorage.getItem("reallanex-prayers") || "{}");
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const done = log[key] || {};
    const count = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].filter(
      (p) => done[p],
    ).length;
    document.getElementById("prayersDone").textContent = `${count}/5`;

    // Tasbih total
    document.getElementById("tasbihTotal").textContent =
      localStorage.getItem("reallanex-tasbih-total") || "0";

    // Streak
    let streak = 0;
    const dd = new Date();
    while (true) {
      const k = `${dd.getFullYear()}-${dd.getMonth() + 1}-${dd.getDate()}`;
      const dayLog = log[k];
      if (dayLog && Object.values(dayLog).some(Boolean)) {
        streak++;
        dd.setDate(dd.getDate() - 1);
      } else break;
    }
    document.getElementById("streakDays").textContent = streak;
  }

  /* ---------- Hijri date (offline — embedded conversion) ---------- */
  function gregorianToHijri(date) {
    // Simple Kuwaiti algorithm
    let y = date.getFullYear(),
      m = date.getMonth() + 1,
      d = date.getDate();
    let jd;
    if (
      y > 1582 ||
      (y === 1582 && m > 10) ||
      (y === 1582 && m === 10 && d > 14)
    ) {
      jd =
        Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
        Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
        Math.floor(
          (3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4,
        ) +
        d -
        32075;
    } else {
      jd =
        367 * y -
        Math.floor((7 * (y + 5001 + Math.floor((m - 9) / 7))) / 4) +
        Math.floor((275 * m) / 9) +
        d +
        1729777;
    }
    let l = jd - 1948440 + 10632;
    let n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
      Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l =
      l -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    m = Math.floor((24 * l) / 709);
    d = l - Math.floor((709 * m) / 24);
    y = 30 * n + j - 30;
    const months = [
      "Muharram",
      "Safar",
      "Rabi al-Awwal",
      "Rabi al-Thani",
      "Jumada al-Awwal",
      "Jumada al-Thani",
      "Rajab",
      "Sha'ban",
      "Ramadan",
      "Shawwal",
      "Dhul Qa'dah",
      "Dhul Hijjah",
    ];
    return { day: d, month: months[m - 1], year: y };
  }

  function setHijri() {
    const h = gregorianToHijri(new Date());
    document.getElementById("hijriDate").textContent =
      `${h.day} ${h.month} ${h.year} AH`;
  }

  /* ---------- Background particles ---------- */
  function initParticles() {
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");
    let w, h, particles;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function create() {
      particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.2 + 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.4 + 0.1,
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const gold = getComputedStyle(document.documentElement)
        .getPropertyValue("--gold")
        .trim();
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = gold;
        ctx.globalAlpha = p.a;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }
    resize();
    create();
    draw();
    window.addEventListener("resize", () => {
      resize();
      create();
    });
  }

  /* ---------- Service Worker ---------- */
  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("sw.js")
        .then((r) => console.log("SW registered:", r.scope))
        .catch((e) => console.warn("SW failed:", e));
    }
  }

  /* ---------- Install prompt ---------- */
  let deferredPrompt = null;
  const INSTALL_DISMISSED_KEY = "reallanex-install-dismissed";

  function showInstallBanner() {
    if (localStorage.getItem(INSTALL_DISMISSED_KEY) === "yes") return;
    document.getElementById("installBanner").classList.remove("hidden");
  }
  function hideInstallBanner() {
    document.getElementById("installBanner").classList.add("hidden");
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function setupInstallPrompt() {
    // Android/Chrome/Edge
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallBanner();
    });

    // iOS Safari — no beforeinstallprompt event, so show instructions manually
    if (
      isIOS() &&
      !navigator.standalone &&
      !window.matchMedia("(display-mode: standalone)").matches
    ) {
      document.getElementById("installSubtext").textContent =
        "Tap Share ➜ Add to Home Screen";
      showInstallBanner();
    }

    document
      .getElementById("installBtn")
      .addEventListener("click", async () => {
        if (isIOS()) {
          App.toast('Tap Share then "Add to Home Screen"');
          return;
        }
        if (!deferredPrompt) {
          App.toast("Install not available yet — try again shortly");
          return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("Install outcome:", outcome);
        deferredPrompt = null;
        hideInstallBanner();
        if (outcome === "accepted") App.toast("Reallanex installed 🎉");
      });

    document.getElementById("installClose").addEventListener("click", () => {
      hideInstallBanner();
      localStorage.setItem(INSTALL_DISMISSED_KEY, "yes");
    });

    window.addEventListener("appinstalled", () => {
      hideInstallBanner();
      App.toast("Reallanex installed 🎉");
    });
  }

  /* ---------- Init ---------- */
  function init() {
    applyTheme(state.theme);
    hideSplash();
    setHijri();
    initParticles();
    registerSW();
    setupInstallPrompt();
    loadMotivation();
    updateHomeStats();

    document
      .getElementById("themeToggle")
      .addEventListener("click", toggleTheme);
    document
      .getElementById("newMotivation")
      .addEventListener("click", loadMotivation);
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good Morning"
        : hour < 17
          ? "Good Afternoon"
          : "Good Evening";
    document.getElementById("greeting").textContent = `${greeting}, Khalid`;
  }

  return { init, toast, switchView, updateHomeStats };
})();

document.addEventListener("DOMContentLoaded", App.init);
