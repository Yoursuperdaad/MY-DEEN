/* ============================================
   names.js — 99 Names of Allah (Asma ul-Husna)
   Author: Khalid (reallanex)
   ============================================ */

const Names = (() => {
  const NAMES_URL =
    "https://raw.githubusercontent.com/rn0x/Names_Of_Allah_Json/main/names.json";
  let loaded = false;

  const FALLBACK = [
    { name: "اللَّهُ", translit: "Allah", english: "The Greatest Name" },
    {
      name: "الرَّحْمَنُ",
      translit: "Ar-Rahman",
      english: "The Most Compassionate",
    },
    { name: "الرَّحِيمُ", translit: "Ar-Raheem", english: "The Most Merciful" },
    { name: "الْمَلِكُ", translit: "Al-Malik", english: "The King" },
    { name: "الْقُدُّوسُ", translit: "Al-Quddus", english: "The Most Holy" },
    {
      name: "السَّلَامُ",
      translit: "As-Salam",
      english: "The Source of Peace",
    },
    {
      name: "الْمُؤْمِنُ",
      translit: "Al-Mu'min",
      english: "The Guarantor of Faith",
    },
    { name: "الْمُهَيْمِنُ", translit: "Al-Muhaymin", english: "The Guardian" },
    { name: "الْعَزِيزُ", translit: "Al-Aziz", english: "The Almighty" },
    { name: "الْجَبَّارُ", translit: "Al-Jabbar", english: "The Compeller" },
    {
      name: "الْمُتَكَبِّرُ",
      translit: "Al-Mutakabbir",
      english: "The Supreme",
    },
    { name: "الْخَالِقُ", translit: "Al-Khaliq", english: "The Creator" },
    { name: "الْبَارِئُ", translit: "Al-Bari'", english: "The Originator" },
    { name: "الْمُصَوِّرُ", translit: "Al-Musawwir", english: "The Fashioner" },
    {
      name: "الْغَفَّارُ",
      translit: "Al-Ghaffar",
      english: "The Ever-Forgiving",
    },
    { name: "الْقَهَّارُ", translit: "Al-Qahhar", english: "The Subduer" },
    { name: "الْوَهَّابُ", translit: "Al-Wahhab", english: "The Bestower" },
    { name: "الرَّزَّاقُ", translit: "Ar-Razzaq", english: "The Provider" },
    { name: "الْفَتَّاحُ", translit: "Al-Fattah", english: "The Opener" },
    { name: "الْعَلِيمُ", translit: "Al-Alim", english: "The All-Knowing" },
  ];

  async function load() {
    const grid = document.getElementById("namesGrid");
    grid.innerHTML =
      '<p style="text-align:center;color:var(--text-soft)">Loading names…</p>';

    try {
      const res = await fetch(NAMES_URL);
      const data = await res.json();
      render(
        data.map((n) => ({
          name: n.name,
          translit: n.translit || "",
          english: n.en?.meaning || n.text || "",
        })),
      );
    } catch {
      render(FALLBACK);
      App.toast("Showing offline names");
    }
  }

  function render(list) {
    const grid = document.getElementById("namesGrid");
    grid.innerHTML = "";
    list.forEach((n, i) => {
      const card = document.createElement("div");
      card.className = "name-card";
      card.style.animationDelay = `${i * 0.03}s`;
      card.innerHTML = `
        <div class="name-arabic">${n.name}</div>
        <div class="name-translit">${n.translit}</div>
        <div class="name-english">${n.english}</div>
      `;
      grid.appendChild(card);
    });
  }

  function init() {
    if (loaded) return;
    loaded = true;
    load();
  }

  return { init };
})();
