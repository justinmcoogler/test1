// Sproutlands service worker — offline play + auto-update.
//
// Network-first: an online player always gets the newest build, so shipping an
// update just means redeploying. When the network is gone, fall back to the
// cached copy. Bump CACHE to evict old caches on the next visit.
//
// A service worker only registers on a SECURE CONTEXT — https, or localhost.
// Over a plain-http LAN address (http://192.168.1.20:8080) the browser refuses,
// which is why js/main.js gates registration on isSecureContext and why the
// README explains what that means for the tablets. Nothing here can work around
// it; that check lives in the browser.
const CACHE = 'sproutlands-v2';

// The shell only. The game is forty-odd ES modules plus CSS, fonts and mob JSON,
// and hand-listing that here would rot the first time a file was renamed — so
// the rest arrives via 'warm' below, which caches what the page ACTUALLY loaded.
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// The page sends the list of same-origin resources it fetched on this load, so
// one online launch is enough to make the next one work with the wifi off.
// Failures are per-URL and silent: a single 404 must not abandon the whole warm.
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'warm' || !Array.isArray(e.data.urls)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = e.data.urls.slice(0, 400);
    // IN SMALL BATCHES. Firing a few hundred requests at once is a thundering
    // herd against the same little Node server the game is being served from,
    // and on a tablet it competes with the renderer for the network and the main
    // thread. Nothing here is urgent — the cache only needs to be warm before
    // the NEXT launch — so it goes twelve at a time.
    for (let i = 0; i < urls.length; i += 12) {
      await Promise.all(urls.slice(i, i + 12).map(async (u) => {
        try { if (!(await cache.match(u))) await cache.add(u); } catch { /* skip it */ }
      }));
    }
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Never intercept the multiplayer socket. The upgrade request is not a fetch
  // so it would not reach here anyway, but being explicit costs nothing and
  // documents that the two systems do not interact.
  if (url.pathname === '/ws') return;
  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      // ONLY CACHE A REAL SUCCESS. The previous version cached every response
      // including errors, which turns a transient 404 or a server hiccup into a
      // permanently broken install: the bad response is served from cache
      // forever after, and the only cure is clearing site data.
      if (net && net.ok && net.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      }
      return net;
    } catch {
      return (await caches.match(req)) || (await caches.match('./index.html'));
    }
  })());
});
