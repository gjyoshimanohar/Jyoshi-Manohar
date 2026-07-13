const CACHE_NAME = 'jm-workspace-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Avoid caching API routes if they change frequently, but here we can cache static assets and dynamic fallback
  const url = new URL(event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Return cached response but also update cache in background
          fetch(event.request).then((networkResponse) => {
             if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
               caches.open(CACHE_NAME).then((cache) => {
                 cache.put(event.request, networkResponse.clone());
               });
             }
          }).catch(console.error);
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch((error) => {
          console.error('Fetch failed:', error);
          // Return offline fallback if we have one, e.g., '/'
          return caches.match('/');
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
