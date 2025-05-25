// Import workbox scripts
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

// Set workbox config
workbox.setConfig({
  debug: true,
});

// Precaching injection point - MUST be present in your service worker
const manifest = self.__WB_MANIFEST;

// Precaching with workbox
workbox.precaching.precacheAndRoute(manifest);

// Cache name
const CACHE_NAME = 'story-share-v1';

// Additional runtime caching
workbox.routing.registerRoute(
  new RegExp('https://unpkg.com/leaflet@1.9.4/dist/'),
  new workbox.strategies.CacheFirst({
    cacheName: 'leaflet-cache',
  })
);

// Cache Google Fonts
workbox.routing.registerRoute(
  new RegExp('https://fonts.(?:googleapis|gstatic).com/(.*)'),
  new workbox.strategies.CacheFirst({
    cacheName: 'google-fonts-cache',
  })
);

// Cache API responses
workbox.routing.registerRoute(
  new RegExp('/stories'),
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
  })
);

// Fallback to index.html for navigation requests
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: CACHE_NAME,
  })
);

// Push notification event listener
self.addEventListener('push', event => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'New Story Shared';
  const options = {
    body: payload.body || 'Someone shared a new story!',
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-96x96.png'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/#/stories')
  );
});