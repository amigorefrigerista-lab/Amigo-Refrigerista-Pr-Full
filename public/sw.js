// Service Worker — Amigo Refrigerista Pro
// Estratégias:
//  - /_next/static e ícones (imutáveis, com hash): cache-first
//  - Navegação (HTML): network-first, com fallback para a última versão em cache e depois /offline.html
//  - /api/* e requisições de outros domínios (Supabase, Gemini, Mercado Pago): sempre rede, NUNCA em cache
// Aumente CACHE_VERSION ao publicar mudanças que exijam limpar o cache antigo.
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `amigo-static-${CACHE_VERSION}`;
const PAGES_CACHE = `amigo-pages-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icon-192.png', '/icon-512.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('amigo-') && k !== STATIC_CACHE && k !== PAGES_CACHE)
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
  if (url.origin !== self.location.origin) return; // Supabase, Gemini etc: direto na rede
  if (url.pathname.startsWith('/api/')) return; // dados nunca ficam em cache

  // Arquivos estáticos com hash: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navegação: network-first com fallback offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match(OFFLINE_URL))
        )
    );
  }
});
