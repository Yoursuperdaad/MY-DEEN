/* ============================================
   app.js — Core application logic
   Author: Khalid (reallanex)
   ============================================ */

const App = (() => {
  const state = {
    theme: localStorage.getItem("reallanex-theme") || "light",
    currentView: "home",
  };

  /* ---------- Splash ---------- */
  function hideSplash() {
    const splash = document.getElementById("splash");
    setTimeout(() => splash.classList.add("hide"), 1600);
  }

  /* ---------- Theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("themeToggle").textContent =
      theme === "dark" ? "☀️" : "🌙";
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
    state.currentView = view;
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (view === "prayer") Prayer.init();
    if (view === "quran") Quran.init();
    if (view === "names") Names.init();
    if (view === "tasbih") Tasbih.init();
  }

  /* ---------- Hijri date ---------- */
  async function loadHijriDate() {
    try {
      const today = new Date();
      const d = today.getDate(),
        m = today.getMonth() + 1,
        y = today.getFullYear();
      const res = await fetch(
        `https://api.aladhan.com/v1/gToH?date=${d}-${m}-${y}`,
      );
      const json = await res.json();
      const h = json.data.hijri;
      document.getElementById("hijriDate").textContent =
        `${h.day} ${h.month.en} ${h.year} AH`;
    } catch {
      document.getElementById("hijriDate").textContent = "";
    }
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

  /* ---------- Background particles ---------- */
  function initParticles() {
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");
    let w, h, particles;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function createParticles() {
      particles = Array.from({ length: 45 }, () => ({
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
    createParticles();
    draw();
    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });
  }

  /* ---------- Service Worker ---------- */
  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("sw.js", { scope: "./" })
        .then((r) => console.log("SW registered:", r.scope))
        .catch((e) => console.warn("SW failed:", e));
    }
  }

  /* ---------- Init ---------- */
  function init() {
    applyTheme(state.theme);
    hideSplash();
    loadHijriDate();
    initParticles();
    registerSW();

    document
      .getElementById("themeToggle")
      .addEventListener("click", toggleTheme);
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    // Greeting based on time
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good Morning"
        : hour < 17
          ? "Good Afternoon"
          : "Good Evening";
    document.getElementById("greeting").textContent = `${greeting}, Khalid`;
  }

  return { init, toast, switchView };
})();

document.addEventListener("DOMContentLoaded", App.init);
