/* BayTag v2.3.0 stable service worker. Same-origin static assets only. */
const CACHE = 'baytag-pwa-v2-3-0-stable';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './update.js', './baytag-upgrades.js', './baytag-easy-mode.js', './version.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys => Promise.all(keys
      .filter(name => name.startsWith('baytag-pwa-') && name !== CACHE)
      .map(name => caches.delete(name))))
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if(req.mode === 'navigate') {
    event.respondWith(fetch(req).then(response => {
      if(response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', copy)));
      }
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if(response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
    }
    return response;
  })));
});
