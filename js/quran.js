/* ============================================
   quran.js — Offline Quran (IndexedDB)
   Author: Khalid (reallanex)
   ============================================ */

const Quran = (() => {
  const DB_NAME = "reallanex-db";
  const DB_VERSION = 1;
  const STORE_META = "meta";
  const STORE_SURAHS = "surahs";
  const STORE_AUDIO = "audio";

  const QURAN_URL = "https://api.alquran.cloud/v1/quran/quran-uthmani";
  const AUDIO_CDN = "https://everyayah.com/data";

  let db = null;
  let surahList = [];
  let currentSurah = null;
  let audio = null;
  let initialized = false;

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_META))
          d.createObjectStore(STORE_META);
        if (!d.objectStoreNames.contains(STORE_SURAHS))
          d.createObjectStore(STORE_SURAHS, { keyPath: "number" });
        if (!d.objectStoreNames.contains(STORE_AUDIO))
          d.createObjectStore(STORE_AUDIO);
      };
      req.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  function idbPut(storeName, value, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = key !== undefined ? store.put(value, key) : store.put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idbGet(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function isQuranDownloaded() {
    const flag = await idbGet(STORE_META, "quran-ready");
    return !!flag;
  }

  /* ---------- Download Quran (one-time, needs internet) ---------- */
  async function downloadQuran() {
    const btn = document.getElementById("downloadQuranBtn");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading…';
    document.getElementById("quranProgressWrap").classList.remove("hidden");

    try {
      const res = await fetch(QURAN_URL);
      const json = await res.json();
      const surahs = json.data.surahs;

      // Store each surah
      for (let i = 0; i < surahs.length; i++) {
        const s = surahs[i];
        await idbPut(STORE_SURAHS, {
          number: s.number,
          name: s.name,
          englishName: s.englishName,
          englishNameTranslation: s.englishNameTranslation,
          numberOfAyahs: s.numberOfAyahs,
          revelationType: s.revelationType,
          ayahs: s.ayahs.map((a) => ({
            number: a.number,
            numberInSurah: a.numberInSurah,
            text: a.text,
          })),
        });
        const pct = Math.round(((i + 1) / surahs.length) * 100);
        document.getElementById("quranProgressBar").style.width = pct + "%";
      }

      await idbPut(STORE_META, true, "quran-ready");
      App.toast("Quran downloaded — works offline now ✓");
      await bootQuranUI();
    } catch (err) {
      console.error(err);
      App.toast("Download failed — check your connection");
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-download"></i> Retry Download';
    }
  }

  /* ---------- Boot UI (after download or on subsequent launches) ---------- */
  async function bootQuranUI() {
    document.getElementById("quranDownloadCard").classList.add("hidden");
    document.getElementById("quranMain").classList.remove("hidden");
    surahList = (await idbGetAll(STORE_SURAHS)).sort(
      (a, b) => a.number - b.number,
    );
    renderSurahList();
  }

  function renderSurahList() {
    const list = document.getElementById("surahList");
    list.innerHTML = "";
    surahList.forEach((s) => {
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

  async function openSurah(num) {
    const s = await idbGet(STORE_SURAHS, num);
    if (!s) {
      App.toast("Surah not found");
      return;
    }
    currentSurah = s;

    document.getElementById("surahList").classList.add("hidden");
    document.getElementById("quranReader").classList.remove("hidden");
    document.getElementById("surahTitle").textContent =
      `${s.number}. ${s.name} — ${s.englishName}`;

    const container = document.getElementById("ayahsContainer");
    container.innerHTML = "";

    s.ayahs.forEach((a) => {
      const div = document.createElement("div");
      div.className = "ayah";
      div.innerHTML = `
        <div class="ayah-arabic">${a.text}</div>
        <div class="ayah-trans">Ayah ${a.numberInSurah}</div>
        <button class="ayah-play" data-surah="${s.number}" data-ayah="${a.numberInSurah}">
          <i class="fa-solid fa-play"></i> Play
        </button>
      `;
      div.querySelector(".ayah-play").addEventListener("click", playAyah);
      container.appendChild(div);
    });

    updateAudioStatus();
  }

  /* ---------- Audio (offline after download) ---------- */
  async function audioCacheKey(surah, ayah, reciter) {
    return `audio::${reciter}::${surah}::${ayah}`;
  }

  async function getCachedAudio(key) {
    return idbGet(STORE_AUDIO, key);
  }
  async function putCachedAudio(key, blob) {
    return idbPut(STORE_AUDIO, blob, key);
  }

  async function playAyah(e) {
    const btn = e.currentTarget;
    const surah = parseInt(btn.dataset.surah);
    const ayah = parseInt(btn.dataset.ayah);
    const reciter = document.getElementById("reciter").value;

    const key = await audioCacheKey(surah, ayah, reciter);
    let blob = await getCachedAudio(key);

    if (!blob) {
      // Try online
      if (!navigator.onLine) {
        App.toast("Ayah not downloaded. Connect once to cache it.");
        return;
      }
      try {
        App.toast("Fetching ayah…");
        const s = String(surah).padStart(3, "0");
        const a = String(ayah).padStart(3, "0");
        const url = `${AUDIO_CDN}/${reciter}/${s}${a}.mp3`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Not found");
        blob = await res.blob();
        await putCachedAudio(key, blob);
      } catch (err) {
        App.toast("Audio unavailable");
        return;
      }
    }

    if (audio) {
      audio.pause();
      audio = null;
    }
    audio = new Audio(URL.createObjectURL(blob));
    audio.play();

    const bar = document.getElementById("audioBar");
    bar.classList.remove("hidden");
    document.getElementById("audioTitle").textContent =
      `Surah ${surah} · Ayah ${ayah}`;
    setPlayIcon(true);

    audio.addEventListener("timeupdate", () => {
      if (audio.duration) {
        document.getElementById("audioProgress").style.width =
          (audio.currentTime / audio.duration) * 100 + "%";
      }
    });
    audio.addEventListener("ended", () => setPlayIcon(false));
  }

  function setPlayIcon(playing) {
    document.getElementById("audioPlayPause").innerHTML = playing
      ? '<i class="fa-solid fa-pause"></i>'
      : '<i class="fa-solid fa-play"></i>';
  }

  async function downloadSurahAudio() {
    if (!currentSurah) return;
    const reciter = document.getElementById("reciter").value;
    const total = currentSurah.ayahs.length;
    let done = 0,
      cached = 0;
    const statusEl = document.getElementById("audioStatus");
    const btn = document.getElementById("downloadSurahAudio");
    btn.disabled = true;

    for (const a of currentSurah.ayahs) {
      const key = await audioCacheKey(
        currentSurah.number,
        a.numberInSurah,
        reciter,
      );
      const existing = await getCachedAudio(key);
      if (!existing) {
        try {
          const s = String(currentSurah.number).padStart(3, "0");
          const ay = String(a.numberInSurah).padStart(3, "0");
          const url = `${AUDIO_CDN}/${reciter}/${s}${ay}.mp3`;
          const res = await fetch(url);
          if (res.ok) {
            const blob = await res.blob();
            await putCachedAudio(key, blob);
            cached++;
          }
        } catch {}
      }
      done++;
      statusEl.textContent = `${done}/${total} ayahs cached…`;
    }

    btn.disabled = false;
    statusEl.textContent = `✓ Cached ${cached} new ayahs — offline ready`;
    App.toast("Surah audio ready offline");
  }

  async function updateAudioStatus() {
    if (!currentSurah) return;
    const reciter = document.getElementById("reciter").value;
    const keys = await Promise.all(
      currentSurah.ayahs.map((a) =>
        audioCacheKey(currentSurah.number, a.numberInSurah, reciter),
      ),
    );
    let cached = 0;
    for (const k of keys) if (await getCachedAudio(k)) cached++;
    const statusEl = document.getElementById("audioStatus");
    statusEl.textContent = `${cached}/${currentSurah.ayahs.length} ayahs offline`;
  }

  /* ---------- Init ---------- */
  async function init() {
    if (!db) await openDB();

    if (!initialized) {
      initialized = true;

      document
        .getElementById("downloadQuranBtn")
        .addEventListener("click", downloadQuran);
      document.getElementById("backToSurahs").addEventListener("click", () => {
        document.getElementById("quranReader").classList.add("hidden");
        document.getElementById("surahList").classList.remove("hidden");
      });
      document
        .getElementById("downloadSurahAudio")
        .addEventListener("click", downloadSurahAudio);
      document
        .getElementById("audioPlayPause")
        .addEventListener("click", () => {
          if (!audio) return;
          if (audio.paused) {
            audio.play();
            setPlayIcon(true);
          } else {
            audio.pause();
            setPlayIcon(false);
          }
        });
      document.getElementById("audioClose").addEventListener("click", () => {
        if (audio) {
          audio.pause();
          audio = null;
        }
        document.getElementById("audioBar").classList.add("hidden");
      });
      document
        .getElementById("reciter")
        .addEventListener("change", updateAudioStatus);
    }

    if (await isQuranDownloaded()) await bootQuranUI();
    else
      document.getElementById("quranDownloadCard").classList.remove("hidden");
  }

  return { init };
})();
