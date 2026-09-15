/* ============================================
   quran.js — Quran reader + audio
   Author: Khalid (reallanex)
   ============================================ */

const Quran = (() => {
  const API = "https://api.alquran.cloud/v1";
  const AUDIO_CDN = "https://everyayah.com/data";
  let surahs = [];
  let currentSurah = null;
  let initialized = false;
  let audio = null;

  /* ---------- Fetch surah list ---------- */
  async function loadSurahs() {
    if (surahs.length) return;
    try {
      const res = await fetch(`${API}/surah`);
      const json = await res.json();
      surahs = json.data;
      renderSurahList();
    } catch {
      App.toast("Could not load surah list");
    }
  }

  function renderSurahList() {
    const list = document.getElementById("surahList");
    list.innerHTML = "";
    surahs.forEach((s) => {
      const card = document.createElement("div");
      card.className = "surah-card";
      card.innerHTML = `
        <div class="surah-num">${s.number}</div>
        <div class="surah-name">${s.name}</div>
        <div class="surah-en">${s.englishName}</div>
      `;
      card.addEventListener("click", () => openSurah(s.number));
      list.appendChild(card);
    });
  }

  /* ---------- Open surah ---------- */
  async function openSurah(num) {
    try {
      const res = await fetch(`${API}/surah/${num}/ar.alafasy`);
      const json = await res.json();
      currentSurah = json.data;
      renderReader();
    } catch {
      App.toast("Could not load surah");
    }
  }

  function renderReader() {
    document.getElementById("surahList").classList.add("hidden");
    document.getElementById("quranReader").classList.remove("hidden");
    document.getElementById("surahTitle").textContent =
      `${currentSurah.number}. ${currentSurah.name} — ${currentSurah.englishName}`;

    const container = document.getElementById("ayahsContainer");
    container.innerHTML = "";

    currentSurah.ayahs.forEach((ayah) => {
      const div = document.createElement("div");
      div.className = "ayah";
      div.innerHTML = `
        <div class="ayah-arabic">${ayah.text}</div>
        <div class="ayah-trans">Ayah ${ayah.numberInSurah}</div>
        <button class="ayah-play" data-surah="${currentSurah.number}" data-ayah="${ayah.numberInSurah}">
          ▶ Play Ayah ${ayah.numberInSurah}
        </button>
      `;
      div.querySelector(".ayah-play").addEventListener("click", playAyah);
      container.appendChild(div);
    });
  }

  /* ---------- Audio playback (EveryAyah CDN) ---------- */
  function playAyah(e) {
    const surah = parseInt(e.target.dataset.surah);
    const ayah = parseInt(e.target.dataset.ayah);
    const reciter = document.getElementById("reciter").value;

    const s = String(surah).padStart(3, "0");
    const a = String(ayah).padStart(3, "0");
    const url = `${AUDIO_CDN}/${reciter}/${s}${a}.mp3`;

    if (audio) {
      audio.pause();
      audio = null;
    }

    audio = new Audio(url);
    audio
      .play()
      .catch(() => App.toast("Audio unavailable for this reciter/ayah"));

    const bar = document.getElementById("audioBar");
    bar.classList.remove("hidden");
    document.getElementById("audioTitle").textContent =
      `Surah ${surah} · Ayah ${ayah} · ${reciter}`;
    document.getElementById("audioPlayPause").textContent = "⏸";

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        document.getElementById("audioProgress").style.width = `${pct}%`;
      }
    });
    audio.addEventListener("ended", () => {
      document.getElementById("audioPlayPause").textContent = "▶";
    });

    App.toast(`Playing ${reciter}…`);
  }

  /* ---------- Init ---------- */
  function init() {
    if (!initialized) {
      initialized = true;
      loadSurahs();
      document.getElementById("backToSurahs").addEventListener("click", () => {
        document.getElementById("quranReader").classList.add("hidden");
        document.getElementById("surahList").classList.remove("hidden");
      });
      document
        .getElementById("audioPlayPause")
        .addEventListener("click", () => {
          if (!audio) return;
          if (audio.paused) {
            audio.play();
            document.getElementById("audioPlayPause").textContent = "⏸";
          } else {
            audio.pause();
            document.getElementById("audioPlayPause").textContent = "▶";
          }
        });
      document.getElementById("audioClose").addEventListener("click", () => {
        if (audio) {
          audio.pause();
          audio = null;
        }
        document.getElementById("audioBar").classList.add("hidden");
      });
    }
  }

  return { init };
})();
