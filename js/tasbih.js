/* ============================================
   tasbih.js — Standalone Tasbih (personal duas)
   Author: Khalid (reallanex)
   ============================================ */

const Tasbih = (() => {
  const STORAGE_TOTAL = "reallanex-tasbih-total";
  const STORAGE_CUSTOM = "reallanex-custom-duas";
  const STORAGE_ACTIVE = "reallanex-active-dhikr";

  const state = {
    count: 0,
    target: 33,
    dhikr: localStorage.getItem(STORAGE_ACTIVE) || "سُبْحَانَ اللَّهِ",
    total: parseInt(localStorage.getItem(STORAGE_TOTAL) || "0", 10),
    customDuas: JSON.parse(localStorage.getItem(STORAGE_CUSTOM) || "[]"),
  };
  let initialized = false;

  const vibrate = (p = 18) => {
    if (navigator.vibrate) navigator.vibrate(p);
  };

  function update() {
    document.getElementById("tasbihCount").textContent = state.count;
    document.getElementById("tasbihTotal").textContent = state.total;
    document.getElementById("tasbihTarget").innerHTML =
      `<i class="fa-solid fa-bullseye"></i> Target: ${state.target}`;
    document.getElementById("currentDhikr").textContent = state.dhikr;
    localStorage.setItem(STORAGE_TOTAL, String(state.total));
    localStorage.setItem(STORAGE_ACTIVE, state.dhikr);
  }

  function increment() {
    state.count++;
    state.total++;
    vibrate();
    update();
    if (state.count === state.target) {
      App.toast(`🎉 ${state.target} completed! MashaAllah`);
      vibrate([40, 30, 40]);
      setTimeout(() => {
        state.count = 0;
        update();
      }, 1200);
    }
  }

  function reset() {
    state.count = 0;
    update();
    App.toast("Counter reset");
  }

  function setActive(label, btn) {
    document
      .querySelectorAll(".dhikr-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    state.dhikr = label;
    state.count = 0;
    update();
  }

  /* ---------- Custom duas ---------- */
  const saveCustom = () =>
    localStorage.setItem(STORAGE_CUSTOM, JSON.stringify(state.customDuas));

  function renderCustom() {
    const container = document.getElementById("customDhikrSelector");
    container.innerHTML = "";
    if (state.customDuas.length === 0) {
      container.innerHTML =
        '<div class="custom-empty">No personal duas yet — add your own below 🤲</div>';
      return;
    }
    state.customDuas.forEach((dua, i) => {
      const btn = document.createElement("button");
      btn.className = "dhikr-btn custom";
      if (dua === state.dhikr) btn.classList.add("active");
      btn.innerHTML = `${escapeHtml(dua)}<button class="del-dua" title="Remove"><i class="fa-solid fa-xmark"></i></button>`;
      btn.addEventListener("click", (e) => {
        if (e.target.closest(".del-dua")) return;
        setActive(dua, btn);
      });
      btn.querySelector(".del-dua").addEventListener("click", (e) => {
        e.stopPropagation();
        removeCustom(i);
      });
      container.appendChild(btn);
    });
  }

  function addCustom() {
    const input = document.getElementById("newDuaInput");
    const v = input.value.trim();
    if (!v) {
      App.toast("Please enter a dua");
      return;
    }
    if (state.customDuas.includes(v)) {
      App.toast("Already exists");
      return;
    }
    state.customDuas.push(v);
    saveCustom();
    input.value = "";
    renderCustom();
    const buttons = document.querySelectorAll(
      "#customDhikrSelector .dhikr-btn",
    );
    setActive(v, buttons[buttons.length - 1]);
    App.toast("Dua added 🤲");
  }

  function removeCustom(i) {
    const removed = state.customDuas[i];
    state.customDuas.splice(i, 1);
    saveCustom();
    renderCustom();
    if (state.dhikr === removed) {
      const first = document.querySelector("#dhikrSelector .dhikr-btn");
      if (first) setActive(first.dataset.dhikr, first);
    }
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function init() {
    if (!initialized) {
      initialized = true;

      document.getElementById("tasbihBtn").addEventListener("click", increment);
      document.getElementById("tasbihReset").addEventListener("click", reset);
      document.getElementById("tasbihTarget").addEventListener("click", () => {
        const targets = [33, 99, 100, 500, 1000];
        const i = targets.indexOf(state.target);
        state.target = targets[(i + 1) % targets.length];
        update();
        App.toast(`Target set to ${state.target}`);
      });

      document.querySelectorAll("#dhikrSelector .dhikr-btn").forEach((btn) => {
        btn.addEventListener("click", () => setActive(btn.dataset.dhikr, btn));
      });

      document.getElementById("addDuaBtn").addEventListener("click", addCustom);
      document
        .getElementById("newDuaInput")
        .addEventListener("keydown", (e) => {
          if (e.key === "Enter") addCustom();
        });

      document.addEventListener("keydown", (e) => {
        if (
          e.code === "Space" &&
          document.getElementById("view-tasbih").classList.contains("active")
        ) {
          const tag = document.activeElement.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA") return;
          e.preventDefault();
          increment();
        }
      });

      renderCustom();
      // Restore active preset if matching
      document.querySelectorAll("#dhikrSelector .dhikr-btn").forEach((b) => {
        if (b.dataset.dhikr === state.dhikr) b.classList.add("active");
      });
    }
    update();
    App.updateHomeStats();
  }

  return { init };
})();
