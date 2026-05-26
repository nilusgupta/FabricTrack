// Kill-switch service worker.
// Older versions of this file cached requests aggressively (including 404
// responses for /api/files/...), which prevented legacy images from loading
// even after the Nginx fix. This replacement unregisters itself on install
// and wipes every Cache Storage entry, so any browser that picks it up
// returns to a clean state on the next reload.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) { /* ignore */ }
    try {
      await self.registration.unregister();
    } catch (_) { /* ignore */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => {
        try { c.navigate(c.url); } catch (_) { /* ignore */ }
      });
    } catch (_) { /* ignore */ }
  })());
});

// Never intercept any fetch — let the browser go straight to the network.
self.addEventListener('fetch', () => {});
