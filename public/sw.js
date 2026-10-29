// Service Worker — Amigo Refrigerista Pro
// Estratégia Offline-First com atualização imediata de código:
//  - Navegação (HTML) e bundles JS/CSS: network-first (sempre busca a versão mais recente quando online e usa cache apenas se offline)
//  - /api/* e domínios externos (Supabase, Gemini, Mercado Pago): sempre rede
const CACHE_VERSION = 'v6';
const STATIC_CACHE = `amigo-static-${CACHE_VERSION}`;
const PAGES_CACHE = `amigo-pages-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icon-192.png', '/icon-512.png']))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Network-first para garantir que atualizações de interface apareçam imediatamente quando online,
  // mantendo fallback completo para o cache quando o técnico estiver sem internet.
  if (
    req.mode === 'navigate' ||
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            const targetCache = req.mode === 'navigate' ? PAGES_CACHE : STATIC_CACHE;
            caches.open(targetCache).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match(OFFLINE_URL) : Response.error()))
        )
    );
  }
});
