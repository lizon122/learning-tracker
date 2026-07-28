// service-worker.js — Offline cache for Commiada-L PWA
var CACHE = "commiada-v1";
var ASSETS = [
  "/learning-tracker/",
  "/learning-tracker/index.html",
  "/learning-tracker/manifest.json",
  "/learning-tracker/css/style.css",
  "/learning-tracker/js/utils.js",
  "/learning-tracker/js/github-auth.js",
  "/learning-tracker/js/auth.js",
  "/learning-tracker/js/store.js",
  "/learning-tracker/js/router.js",
  "/learning-tracker/js/dashboard.js",
  "/learning-tracker/js/courses.js",
  "/learning-tracker/js/timer.js",
  "/learning-tracker/js/analytics.js",
  "/learning-tracker/js/settings.js",
  "/learning-tracker/js/app.js",
  "/learning-tracker/icon-192.png",
  "/learning-tracker/icon-512.png",
  "https://cdn.jsdelivr.net/npm/chart.js@4"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(e) {
  // Don't cache GitHub API calls
  if (e.request.url.indexOf("api.github.com") !== -1) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});
