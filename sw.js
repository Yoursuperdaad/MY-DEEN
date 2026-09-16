/* ============================================
   sw.js — Service Worker (offline app shell)
   Author: Khalid (reallanex)
   ============================================ */

const CACHE_NAME = "reallanex-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/prayer.js",
  "./js/quran.js",
  "./js/names.js",
  "./js/tasbih.js",
  "./manifest.json",
  // Font Awesome (must exist in your project)
  "./vendor/fontawesome/css/all.min.css",
  "./vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "./vendor/fontawesome/webfonts/fa-regular-400.woff2",
  "./vendor/fontawesome/webfonts/fa-brands-400.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache
          .addAll(ASSETS)
          .catch((err) => console.warn("Some assets failed:", err)),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Skip cached requests that IndexedDB handles (Quran, audio)
  // We only cache the app shell and Font Awesome / Google Fonts.

  // Google Fonts (cached once, then offline)
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            return res;
          })
          .catch(() => cached);
      }),
    );
    return;
  }

  // Everything else: cache-first (app shell), fallback to network
  event.respondWith(
    caches
      .match(request)
      .then((cached) => cached || fetch(request).catch(() => cached)),
  );
});
