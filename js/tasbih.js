/* ============================================
   tasbih.js — Standalone Tasbih counter
   Free for personal duas — not tied to prayers
   Author: Khalid (reallanex)
   ============================================ */

const Tasbih = (() => {
  const STORAGE_TOTAL = 'reallanex-tasbih-total';
  const STORAGE_CUSTOM = 'reallanex-custom-duas';
  const STORAGE_ACTIVE = 'reallanex-active-dhikr';

  const state = {
    count: 0,
    target: 33,
    dhikr: localStorage.getItem(STORAGE_ACTIVE) || 'سُبْحَانَ اللَّهِ',
    total: parseInt(localStorage.getItem(STORAGE_TOTAL) || '0', 10),
    customDuas: JSON.parse(localStorage.getItem(STORAGE_CUSTOM) || '[]'),
  };
  let initialized = false;

  function vibrate(pattern = 18) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function update() {
    document.getElementById('tasbihCount').textContent = state.count;
    document.getElementById('tasbihTotal').textContent = state.total;
    document.getElementById('tasbihTarget').textContent = `Target: ${state.target}`;
    document.getElementById('currentDhikr').textContent = state.dhikr;
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
      setTimeout(() => { state.count = 0; update(); }, 1200);
    }
  }

  function reset() {
    state.count = 0;
    update();
    App.toast('Counter reset');
  }

  function setActiveDhikr(label, btnElement) {
    // Clear all active states across both selectors
    document.querySelectorAll('.dhikr-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    state.dhikr = label;
    state.count = 0;
    update();
  }

  /* ---------- Custom duas ---------- */
  function saveCustomDuas() {
    localStorage.setItem(STORAGE_CUSTOM, JSON.stringify(state.customDuas));
  }

  function renderCustomDuas() {
    const container = document.getElementById('customDhikrSelector');
    container.innerHTML = '';

    if (state.customDuas.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'custom-empty';
      empty.textContent = 'No personal duas yet — add your own below 🤲';
      container.appendChild(empty);
      return;
    }

    state.customDuas.forEach((dua, index) => {
      const btn = document.createElement('button');
      btn.className = 'dhikr-btn custom';
      if (dua === state.dhikr) btn.classList.add('active');
      btn.innerHTML = `${escapeHtml(dua)}<button class="del-dua" title="Remove">✕</button>`;

      btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('del-dua')) return;
        setActiveDhikr(dua, btn);
      });

      btn.querySelector('.del-dua').addEventListener('click', (e) => {
        e.stopPropagation();
        removeCustomDua(index);
      });

      container.appendChild(btn);
    });
  }

  function addCustomDua() {
    const input = document.getElementById('newDuaInput');
    const value = input.value.trim();
    if (!value) { App.toast('Please enter a dua'); return; }
    if (state.customDuas.includes(value)) { App.toast('Already exists'); return; }

    state.customDuas.push(value);
    saveCustomDuas();
    input.value = '';
    renderCustomDuas();

    // Auto-select the newly added dua
    const buttons = document.querySelectorAll('#customDhikrSelector .dhikr-btn');
    const newBtn = buttons[buttons.length - 1];
    setActiveDhikr(value, newBtn);

    App.toast('Dua added 🤲');
  }

  function removeCustomDua(index) {
    const removed = state.customDuas[index];
    state.customDuas.splice(index, 1);
    saveCustomDuas();
    renderCustomDuas();

    // If the removed dua was active, fall back to first religious preset
    if (state.dhikr === removed) {
      const firstPreset = document.querySelector('#dhikrSelector .dhikr-btn');
      if (firstPreset) setActiveDhikr(firstPreset.dataset.dhikr, firstPreset);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Init ---------- */
  function init() {
    if (!initialized) {
      initialized = true;

      document.getElementById('tasbihBtn').addEventListener('click', increment);
      document.getElementById('tasbihReset').addEventListener('click', reset);

      document.getElementById('tasbihTarget').addEventListener('click', () => {
        const targets = [33, 99, 100, 500, 1000];
        const idx = targets.indexOf(state.target);
        state.target = targets[(idx + 1) % targets.length];
        update();
        App.toast(`Target set to ${state.target}`);
      });

      // Religious presets
      document.querySelectorAll('#dhikrSelector .dhikr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setActiveDhikr(btn.dataset.dhikr, btn);
        });
      });

      // Custom duas
      document.getElementById('addDuaBtn').addEventListener('click', addCustomDua);
      document.getElementById('newDuaInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') addCustomDua();
      });

      // Keyboard tap support (spacebar)
      document.addEventListener('keydown', e => {
        if (e.code === 'Space' && document.getElementById('view-tasbih').classList.contains('active')) {
          const tag = document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          e.preventDefault();
          increment();
        }
      });

      renderCustomDuas();

      // If active dhikr is a custom dua that no longer exists, reset to first preset
      if (state.customDuas.indexOf(state.dhikr) === -1) {
        const isPreset = [...document.querySelectorAll('#dhikrSelector .dhikr-btn')]
          .some(b => b.dataset.dhikr === state.dhikr);
        if (!isPreset && state.dhikr !== '') {
          // keep custom label as-is if it's just not in presets (may be custom)
        }
        // Ensure one preset is active if dhikr matches a preset
        document.querySelectorAll('#dhikrSelector .dhikr-btn').forEach(b => {
          if (b.dataset.dhikr === state.dhikr) b.classList.add('active');
        });
      }
    }
    update();
  }

  return { init };
})();/* ============================================
   tasbih.js — Standalone Tasbih counter
   Free for personal duas — not tied to prayers
   Author: Khalid (reallanex)
   ============================================ */

const Tasbih = (() => {
  const STORAGE_TOTAL = 'reallanex-tasbih-total';
  const STORAGE_CUSTOM = 'reallanex-custom-duas';
  const STORAGE_ACTIVE = 'reallanex-active-dhikr';

  const state = {
    count: 0,
    target: 33,
    dhikr: localStorage.getItem(STORAGE_ACTIVE) || 'سُبْحَانَ اللَّهِ',
    total: parseInt(localStorage.getItem(STORAGE_TOTAL) || '0', 10),
    customDuas: JSON.parse(localStorage.getItem(STORAGE_CUSTOM) || '[]'),
  };
  let initialized = false;

  function vibrate(pattern = 18) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  function update() {
    document.getElementById('tasbihCount').textContent = state.count;
    document.getElementById('tasbihTotal').textContent = state.total;
    document.getElementById('tasbihTarget').textContent = `Target: ${state.target}`;
    document.getElementById('currentDhikr').textContent = state.dhikr;
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
      setTimeout(() => { state.count = 0; update(); }, 1200);
    }
  }

  function reset() {
    state.count = 0;
    update();
    App.toast('Counter reset');
  }

  function setActiveDhikr(label, btnElement) {
    // Clear all active states across both selectors
    document.querySelectorAll('.dhikr-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    state.dhikr = label;
    state.count = 0;
    update();
  }

  /* ---------- Custom duas ---------- */
  function saveCustomDuas() {
    localStorage.setItem(STORAGE_CUSTOM, JSON.stringify(state.customDuas));
  }

  function renderCustomDuas() {
    const container = document.getElementById('customDhikrSelector');
    container.innerHTML = '';

    if (state.customDuas.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'custom-empty';
      empty.textContent = 'No personal duas yet — add your own below 🤲';
      container.appendChild(empty);
      return;
    }

    state.customDuas.forEach((dua, index) => {
      const btn = document.createElement('button');
      btn.className = 'dhikr-btn custom';
      if (dua === state.dhikr) btn.classList.add('active');
      btn.innerHTML = `${escapeHtml(dua)}<button class="del-dua" title="Remove">✕</button>`;

      btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('del-dua')) return;
        setActiveDhikr(dua, btn);
      });

      btn.querySelector('.del-dua').addEventListener('click', (e) => {
        e.stopPropagation();
        removeCustomDua(index);
      });

      container.appendChild(btn);
    });
  }

  function addCustomDua() {
    const input = document.getElementById('newDuaInput');
    const value = input.value.trim();
    if (!value) { App.toast('Please enter a dua'); return; }
    if (state.customDuas.includes(value)) { App.toast('Already exists'); return; }

    state.customDuas.push(value);
    saveCustomDuas();
    input.value = '';
    renderCustomDuas();

    // Auto-select the newly added dua
    const buttons = document.querySelectorAll('#customDhikrSelector .dhikr-btn');
    const newBtn = buttons[buttons.length - 1];
    setActiveDhikr(value, newBtn);

    App.toast('Dua added 🤲');
  }

  function removeCustomDua(index) {
    const removed = state.customDuas[index];
    state.customDuas.splice(index, 1);
    saveCustomDuas();
    renderCustomDuas();

    // If the removed dua was active, fall back to first religious preset
    if (state.dhikr === removed) {
      const firstPreset = document.querySelector('#dhikrSelector .dhikr-btn');
      if (firstPreset) setActiveDhikr(firstPreset.dataset.dhikr, firstPreset);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Init ---------- */
  function init() {
    if (!initialized) {
      initialized = true;

      document.getElementById('tasbihBtn').addEventListener('click', increment);
      document.getElementById('tasbihReset').addEventListener('click', reset);

      document.getElementById('tasbihTarget').addEventListener('click', () => {
        const targets = [33, 99, 100, 500, 1000];
        const idx = targets.indexOf(state.target);
        state.target = targets[(idx + 1) % targets.length];
        update();
        App.toast(`Target set to ${state.target}`);
      });

      // Religious presets
      document.querySelectorAll('#dhikrSelector .dhikr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setActiveDhikr(btn.dataset.dhikr, btn);
        });
      });

      // Custom duas
      document.getElementById('addDuaBtn').addEventListener('click', addCustomDua);
      document.getElementById('newDuaInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') addCustomDua();
      });

      // Keyboard tap support (spacebar)
      document.addEventListener('keydown', e => {
        if (e.code === 'Space' && document.getElementById('view-tasbih').classList.contains('active')) {
          const tag = document.activeElement.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA') return;
          e.preventDefault();
          increment();
        }
      });

      renderCustomDuas();

      // If active dhikr is a custom dua that no longer exists, reset to first preset
      if (state.customDuas.indexOf(state.dhikr) === -1) {
        const isPreset = [...document.querySelectorAll('#dhikrSelector .dhikr-btn')]
          .some(b => b.dataset.dhikr === state.dhikr);
        if (!isPreset && state.dhikr !== '') {
          // keep custom label as-is if it's just not in presets (may be custom)
        }
        // Ensure one preset is active if dhikr matches a preset
        document.querySelectorAll('#dhikrSelector .dhikr-btn').forEach(b => {
          if (b.dataset.dhikr === state.dhikr) b.classList.add('active');
        });
      }
    }
    update();
  }

  return { init };
})();