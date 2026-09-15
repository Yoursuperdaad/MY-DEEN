/* ============================================
   sw.js — Service Worker for Reallanex PWA
   Author: Khalid (reallanex)
   ============================================ */

const CACHE_NAME = "reallanex-v1";
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
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
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
  const url = new URL(request.url);
  if (request.method !== "GET") return;

  if (
    url.hostname.includes("api.alquran.cloud") ||
    url.hostname.includes("api.aladhan.com") ||
    url.hostname.includes("everyayah.com") ||
    url.hostname.includes("raw.githubusercontent.com")
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-prayers") {
    console.log("Background sync triggered");
  }
});
