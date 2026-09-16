/* ============================================
   names.js — 99 Names of Allah (offline)
   Author: Khalid (reallanex)
   ============================================ */

const Names = (() => {
  const NAMES = [
    { ar: "الرَّحْمَنُ", tr: "Ar-Rahman", en: "The Most Compassionate" },
    { ar: "الرَّحِيمُ", tr: "Ar-Raheem", en: "The Most Merciful" },
    { ar: "الْمَلِكُ", tr: "Al-Malik", en: "The King" },
    { ar: "الْقُدُّوسُ", tr: "Al-Quddus", en: "The Most Holy" },
    { ar: "السَّلَامُ", tr: "As-Salam", en: "The Source of Peace" },
    { ar: "الْمُؤْمِنُ", tr: "Al-Mu'min", en: "The Guarantor of Faith" },
    { ar: "الْمُهَيْمِنُ", tr: "Al-Muhaymin", en: "The Guardian" },
    { ar: "الْعَزِيزُ", tr: "Al-Aziz", en: "The Almighty" },
    { ar: "الْجَبَّارُ", tr: "Al-Jabbar", en: "The Compeller" },
    { ar: "الْمُتَكَبِّرُ", tr: "Al-Mutakabbir", en: "The Supreme" },
    { ar: "الْخَالِقُ", tr: "Al-Khaliq", en: "The Creator" },
    { ar: "الْبَارِئُ", tr: "Al-Bari'", en: "The Originator" },
    { ar: "الْمُصَوِّرُ", tr: "Al-Musawwir", en: "The Fashioner" },
    { ar: "الْغَفَّارُ", tr: "Al-Ghaffar", en: "The Ever-Forgiving" },
    { ar: "الْقَهَّارُ", tr: "Al-Qahhar", en: "The Subduer" },
    { ar: "الْوَهَّابُ", tr: "Al-Wahhab", en: "The Bestower" },
    { ar: "الرَّزَّاقُ", tr: "Ar-Razzaq", en: "The Provider" },
    { ar: "الْفَتَّاحُ", tr: "Al-Fattah", en: "The Opener" },
    { ar: "الْعَلِيمُ", tr: "Al-Alim", en: "The All-Knowing" },
    { ar: "الْقَابِضُ", tr: "Al-Qabid", en: "The Withholder" },
    { ar: "الْبَاسِطُ", tr: "Al-Basit", en: "The Extender" },
    { ar: "الْخَافِضُ", tr: "Al-Khafid", en: "The Abaser" },
    { ar: "الرَّافِعُ", tr: "Ar-Rafi'", en: "The Exalter" },
    { ar: "الْمُعِزُّ", tr: "Al-Mu'izz", en: "The Honourer" },
    { ar: "الْمُذِلُّ", tr: "Al-Mudhill", en: "The Humiliator" },
    { ar: "السَّمِيعُ", tr: "As-Sami'", en: "The All-Hearing" },
    { ar: "الْبَصِيرُ", tr: "Al-Basir", en: "The All-Seeing" },
    { ar: "الْحَكَمُ", tr: "Al-Hakam", en: "The Judge" },
    { ar: "الْعَدْلُ", tr: "Al-Adl", en: "The Utterly Just" },
    { ar: "اللَّطِيفُ", tr: "Al-Latif", en: "The Subtle One" },
    { ar: "الْخَبِيرُ", tr: "Al-Khabir", en: "The All-Aware" },
    { ar: "الْحَلِيمُ", tr: "Al-Halim", en: "The Most Forbearing" },
    { ar: "الْعَظِيمُ", tr: "Al-Azim", en: "The Magnificent" },
    { ar: "الْغَفُورُ", tr: "Al-Ghafur", en: "The Great Forgiver" },
    { ar: "الشَّكُورُ", tr: "Ash-Shakur", en: "The Most Appreciative" },
    { ar: "الْعَلِيُّ", tr: "Al-Ali", en: "The Most High" },
    { ar: "الْكَبِيرُ", tr: "Al-Kabir", en: "The Most Great" },
    { ar: "الْحَفِيظُ", tr: "Al-Hafiz", en: "The Preserver" },
    { ar: "الْمُقِيتُ", tr: "Al-Muqit", en: "The Sustainer" },
    { ar: "الْحَسِيبُ", tr: "Al-Hasib", en: "The Reckoner" },
    { ar: "الْجَلِيلُ", tr: "Al-Jalil", en: "The Majestic" },
    { ar: "الْكَرِيمُ", tr: "Al-Karim", en: "The Most Generous" },
    { ar: "الرَّقِيبُ", tr: "Ar-Raqib", en: "The Watchful" },
    { ar: "الْمُجِيبُ", tr: "Al-Mujib", en: "The Responsive" },
    { ar: "الْوَاسِعُ", tr: "Al-Wasi'", en: "The All-Encompassing" },
    { ar: "الْحَكِيمُ", tr: "Al-Hakim", en: "The All-Wise" },
    { ar: "الْوَدُودُ", tr: "Al-Wadud", en: "The Most Loving" },
    { ar: "الْمَجِيدُ", tr: "Al-Majid", en: "The Glorious" },
    { ar: "الْبَاعِثُ", tr: "Al-Ba'ith", en: "The Resurrector" },
    { ar: "الشَّهِيدُ", tr: "Ash-Shahid", en: "The Witness" },
    { ar: "الْحَقُّ", tr: "Al-Haqq", en: "The Absolute Truth" },
    { ar: "الْوَكِيلُ", tr: "Al-Wakil", en: "The Trustee" },
    { ar: "الْقَوِيُّ", tr: "Al-Qawi", en: "The Most Strong" },
    { ar: "الْمَتِينُ", tr: "Al-Matin", en: "The Firm One" },
    { ar: "الْوَلِيُّ", tr: "Al-Wali", en: "The Protecting Friend" },
    { ar: "الْحَمِيدُ", tr: "Al-Hamid", en: "The Praiseworthy" },
    { ar: "الْمُحْصِي", tr: "Al-Muhsi", en: "The Reckoner of All" },
    { ar: "الْمُبْدِئُ", tr: "Al-Mubdi'", en: "The Originator" },
    { ar: "الْمُعِيدُ", tr: "Al-Mu'id", en: "The Restorer" },
    { ar: "الْمُحْيِي", tr: "Al-Muhyi", en: "The Giver of Life" },
    { ar: "الْمُمِيتُ", tr: "Al-Mumit", en: "The Bringer of Death" },
    { ar: "الْحَيُّ", tr: "Al-Hayy", en: "The Ever-Living" },
    { ar: "الْقَيُّومُ", tr: "Al-Qayyum", en: "The Self-Subsisting" },
    { ar: "الْوَاجِدُ", tr: "Al-Wajid", en: "The Perceiver" },
    { ar: "الْمَاجِدُ", tr: "Al-Majid", en: "The Noble" },
    { ar: "الْوَاحِدُ", tr: "Al-Wahid", en: "The One" },
    { ar: "الْأَحَدُ", tr: "Al-Ahad", en: "The Unique" },
    { ar: "الصَّمَدُ", tr: "As-Samad", en: "The Eternal Refuge" },
    { ar: "الْقَادِرُ", tr: "Al-Qadir", en: "The All-Powerful" },
    { ar: "الْمُقْتَدِرُ", tr: "Al-Muqtadir", en: "The Omnipotent" },
    { ar: "الْمُقَدِّمُ", tr: "Al-Muqaddim", en: "The Expediter" },
    { ar: "الْمُؤَخِّرُ", tr: "Al-Mu'akhkhir", en: "The Delayer" },
    { ar: "الْأَوَّلُ", tr: "Al-Awwal", en: "The First" },
    { ar: "الْآخِرُ", tr: "Al-Akhir", en: "The Last" },
    { ar: "الظَّاهِرُ", tr: "Az-Zahir", en: "The Manifest" },
    { ar: "الْبَاطِنُ", tr: "Al-Batin", en: "The Hidden" },
    { ar: "الْوَالِي", tr: "Al-Wali", en: "The Governor" },
    { ar: "الْمُتَعَالِي", tr: "Al-Muta'ali", en: "The Most Exalted" },
    { ar: "الْبَرُّ", tr: "Al-Barr", en: "The Source of Goodness" },
    { ar: "التَّوَّابُ", tr: "At-Tawwab", en: "The Ever-Pardoning" },
    { ar: "الْمُنْتَقِمُ", tr: "Al-Muntaqim", en: "The Avenger" },
    { ar: "الْعَفُوُّ", tr: "Al-Afuww", en: "The Pardoner" },
    { ar: "الرَّءُوفُ", tr: "Ar-Ra'uf", en: "The Most Kind" },
    {
      ar: "مَالِكُ الْمُلْكِ",
      tr: "Malik-ul-Mulk",
      en: "Master of the Kingdom",
    },
    {
      ar: "ذُو الْجَلَالِ وَالْإِكْرَامِ",
      tr: "Dhul-Jalali wal-Ikram",
      en: "Lord of Majesty and Generosity",
    },
    { ar: "الْمُقْسِطُ", tr: "Al-Muqsit", en: "The Equitable" },
    { ar: "الْجَامِعُ", tr: "Al-Jami'", en: "The Gatherer" },
    { ar: "الْغَنِيُّ", tr: "Al-Ghani", en: "The Self-Sufficient" },
    { ar: "الْمُغْنِي", tr: "Al-Mughni", en: "The Enricher" },
    { ar: "الْمَانِعُ", tr: "Al-Mani'", en: "The Preventer" },
    { ar: "الضَّارُّ", tr: "Ad-Darr", en: "The Distresser" },
    { ar: "النَّافِعُ", tr: "An-Nafi'", en: "The Benefactor" },
    { ar: "النُّورُ", tr: "An-Nur", en: "The Light" },
    { ar: "الْهَادِي", tr: "Al-Hadi", en: "The Guide" },
    { ar: "الْبَدِيعُ", tr: "Al-Badi'", en: "The Incomparable Originator" },
    { ar: "الْبَاقِي", tr: "Al-Baqi", en: "The Everlasting" },
    { ar: "الْوَارِثُ", tr: "Al-Warith", en: "The Inheritor of All" },
    { ar: "الرَّشِيدُ", tr: "Ar-Rashid", en: "The Guide to the Right Path" },
    { ar: "الصَّبُورُ", tr: "As-Sabur", en: "The Most Patient" },
  ];

  let loaded = false;

  function init() {
    if (loaded) return;
    loaded = true;
    const grid = document.getElementById("namesGrid");
    grid.innerHTML = "";
    NAMES.forEach((n, i) => {
      const card = document.createElement("div");
      card.className = "name-card";
      card.style.animationDelay = `${Math.min(i, 20) * 0.03}s`;
      card.innerHTML = `
        <div class="name-arabic">${n.ar}</div>
        <div class="name-translit">${n.tr}</div>
        <div class="name-english">${n.en}</div>
      `;
      grid.appendChild(card);
    });
  }

  return { init };
})();
