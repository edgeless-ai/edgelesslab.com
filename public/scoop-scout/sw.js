/* Scoop Scout service worker — offline app shell + runtime cache for CDN assets */
var VERSION = 'scoopscout-v5';
var SHELL = VERSION + '-shell';
var RUNTIME = VERSION + '-runtime';

var PRECACHE = [
  'index.html',
  'gate.html',
  'map.html',
  'menu.html',
  'cart.html',
  'checkout.html',
  'order-success.html',
  'phone.html',
  'manifest.webmanifest',
  'js/app.js',
  'js/auth.js',
  'js/phone-frame.js',
  'assets/vendor/leaflet/leaflet.js',
  'assets/vendor/leaflet/leaflet.css',
  'assets/vendor/leaflet/images/marker-icon.png',
  'assets/vendor/leaflet/images/marker-icon-2x.png',
  'assets/vendor/leaflet/images/marker-shadow.png',
  'assets/vendor/leaflet/images/layers.png',
  'assets/vendor/leaflet/images/layers-2x.png',
  'assets/js/tailwind.js',
  'assets/js/tailwind-forms.js',
  'assets/img/logo-wordmark.jpg',
  'assets/img/avatar.jpg',
  'assets/img/city-map.jpg',
  'assets/img/truck.jpg',
  'assets/img/cart-scoop.jpg',
  'assets/img/cookie-monster.jpg',
  'assets/img/marionberry.jpg',
  'assets/img/brand-hero.svg',
  'assets/img/menu-hero.svg',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-32.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      return c.addAll(PRECACHE);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== RUNTIME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // OSM map tiles: always network-only — never precached, never cache-first
  // (tile usage policy + they'd bloat the cache).
  if (url.hostname === 'tile.openstreetmap.org' ||
      url.hostname.endsWith('.tile.openstreetmap.org')) {
    return; // let the browser fetch normally, no SW caching
  }

  if (url.origin === self.location.origin) {
    // HTML navigations: network-first so deployed updates are picked up,
    // falling back to cache, then to the shell index for unknown pages.
    if (req.mode === 'navigate') {
      e.respondWith(
        fetch(req).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(SHELL).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match('index.html');
          });
        })
      );
      return;
    }
    // Static assets: cache-first.
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(SHELL).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  // Cross-origin (Google Fonts): stale-while-revalidate.
  e.respondWith(
    caches.open(RUNTIME).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      });
    })
  );
});
