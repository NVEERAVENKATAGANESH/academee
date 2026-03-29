// ════════════════════════════════════════════════════════
//  SERVICE WORKER  —  Academe SIS PWA
//  Strategy: Cache-first for static assets,
//            network-first for index.html
// ════════════════════════════════════════════════════════
'use strict';

const CACHE  = 'academe-v2';
const STATIC = [
  './',
  './index.html',
  './css/style.css',
  './js/constants.js',
  './js/db.js',
  './js/state.js',
  './js/utils.js',
  './js/validation.js',
  './js/ui.js',
  './js/charts.js',
  './js/pdf.js',
  './js/seed.js',
  './js/auth.js',
  './js/admin.js',
  './js/faculty.js',
  './js/student.js',
  './js/app.js',
  // CDN resources are intentionally omitted — they will
  // be served from the network and cached on first fetch.
];

// ───────────────────────────────────────────
//  INSTALL  —  pre-cache all static assets
// ───────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC))
  );
  // Take control immediately rather than waiting for old SW to expire
  self.skipWaiting();
});

// ───────────────────────────────────────────
//  ACTIVATE  —  evict old caches
// ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  // Claim all open clients so they use this SW immediately
  self.clients.claim();
});

// ───────────────────────────────────────────
//  FETCH  —  serve from cache, fall back to network
// ───────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests on our origin (or same-origin assets)
  if (request.method !== 'GET') return;

  // Network-first for index.html so the app always gets the latest shell
  if (url.pathname.endsWith('index.html') || url.pathname === url.origin + '/') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for everything else (JS, CSS, icons, CDN scripts)
  event.respondWith(cacheFirst(request));
});

// ───────────────────────────────────────────
//  Strategies
// ───────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return a minimal offline placeholder
    return new Response(_offlinePage(), {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(_offlinePage(), {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

// ── Offline page HTML ──────────────────────────────────
function _offlinePage() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — Academe SIS</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;max-width:380px;width:100%;text-align:center}
.logo{width:48px;height:48px;background:#3b82f6;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;margin:0 auto 20px}
h1{font-size:18px;font-weight:600;letter-spacing:-0.3px;margin-bottom:8px}
p{font-size:13px;color:#a1a1aa;line-height:1.6;margin-bottom:24px}
button{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;cursor:pointer;transition:opacity .15s}
button:hover{opacity:.88}
.dot{width:8px;height:8px;background:#ef4444;border-radius:50%;display:inline-block;margin-bottom:12px;animation:pulse 1.4s ease infinite}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
</style></head><body>
<div class="card">
  <div class="logo">A</div>
  <div class="dot"></div>
  <h1>You're offline</h1>
  <p>Academe SIS requires a connection to load this resource. Check your internet connection and try again.</p>
  <button onclick="location.reload()">Try again</button>
</div>
</body></html>`;
}
