// Service Worker for OL Explorer PWA
const CACHE_NAME = 'ol-explorer-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo192.png',
  '/logo512.png',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/media/', // For any media assets
  '/static/css/', // For CSS files
  // Add app-specific routes for offline access
  '/account',
  '/tx',
  // Add fallback assets
  '/offline.html' // Will be created if needed
];

// Default offline page content - can be served if network is unavailable
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Open Libra Explorer</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0B1221;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    h1 {
      color: #E75A5C;
      margin-bottom: 1rem;
    }
    p {
      max-width: 500px;
      line-height: 1.5;
    }
    button {
      background-color: #E75A5C;
      color: white;
      border: none;
      padding: 12px 24px;
      margin-top: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>You're Offline</h1>
  <p>Open Libra Explorer requires an internet connection to fetch blockchain data. Please check your connection and try again.</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>
`;

// Install a service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');

        // Create and cache the offline HTML page
        cache.put(new Request('/offline.html'), new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html' }
        }));

        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Cache and return requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request for fetch and cache
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // If network fails, attempt to serve an offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html') || caches.match('/');
          }
          // For API calls, you might want to return a custom response
          if (event.request.url.includes('/api/')) {
            return new Response(JSON.stringify({ error: 'You are offline' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return null;
        });
      })
  );
});

// Update service worker - clean old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      // Claim clients so the page is controlled immediately by the updated service worker
      return self.clients.claim();
    })
  );
}); 