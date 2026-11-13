/**
 * FerreJade, C.A. - Progressive Web App Service Worker (PWA)
 * Habilita instalación en celulares (Android / iOS) y almacenamiento en caché sin conexión.
 */

const CACHE_NAME = 'ferrejade-cache-v1.27';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './uploads/branding/ferrejade_logo.svg',
  './uploads/branding/ferrejade_isotipo.svg',
  './uploads/branding/ferrejade_logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[FerreJade SW] Advertencia al precargar caché inicial:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // No interceptar llamadas a APIs dinámicas (Backend, BCV, Gemini, etc.)
  if (
    url.includes('/api/') ||
    url.includes('googleapis.com') ||
    url.includes('script.google.com') ||
    url.includes('googleusercontent.com')
  ) {
    return;
  }

  // Para la navegación HTML (SPA): Estrategia Network-First para reflejar actualizaciones de inmediato
  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.endsWith('/') ||
    url.includes('index.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./')))
    );
    return;
  }

  // Para recursos estáticos (imágenes, logos, fuentes): Cache First con fallback a red
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    }).catch(() => {
      return caches.match('./');
    })
  );
});
