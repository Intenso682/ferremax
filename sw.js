/**
 * FerreJade, C.A. - Progressive Web App Service Worker (PWA)
 * Habilita instalación en celulares (Android / iOS) y almacenamiento en caché sin conexión.
 */

const CACHE_NAME = 'ferrejade-cache-v1.17';
const CORE_ASSETS = [
  './',
  './Prototipo Sistema Integrado empresa.html',
  './manifest.json',
  './uploads/branding/ferrejade_logo.svg',
  './uploads/branding/ferrejade_isotipo.svg',
  './uploads/branding/ferrejade_logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[FerreJade SW] Advertencia al precargar caché inicial:', err);
      });
    })
  );
  self.skipWaiting();
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

  // No interceptar llamadas a APIs dinámicas (Gemini, Backend, BCV, Google Apps Script)
  if (
    url.includes('/api/') ||
    url.includes('googleapis.com') ||
    url.includes('script.google.com') ||
    url.includes('googleusercontent.com')
  ) {
    return;
  }

  // Estrategia Cache First con fallback a red para la interfaz gráfica
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano busca si hay una versión actualizada
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    }).catch(() => {
      return caches.match('./Prototipo Sistema Integrado empresa.html');
    })
  );
});
