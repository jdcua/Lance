/* Lance trial service worker — handwritten, full offline app.
 * Same-origin only. No analytics, no push, no background sync.
 * Versioned cache so each release replaces the last cleanly.
 * Install precaches the shell, then every build asset (via the
 * asset-manifest.json the build writes), so ANY route works offline after
 * one visit — even routes never opened while online. Runtime caching keeps
 * warming the cache afterwards. Review in one sitting.
 */
'use strict';

// Replaced at build time with "<version>-<shorthash>" so each deploy gets
// fresh bytes (service workers only update when the script changes).
var BUILD_ID = '__TRIAL_BUILD_ID__';
var CACHE = 'lance-trial-v0.9.9-1';
var SHELL = ['/try/', '/try/index.html', '/try/manifest.trial.webmanifest'];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isTrialPath(url) {
  return url.pathname === '/try' || url.pathname.indexOf('/try/') === 0;
}

function shouldCache(request, url) {
  if (request.method !== 'GET') return false;
  if (!isSameOrigin(url)) return false;
  if (!isTrialPath(url)) return false;
  if (url.pathname.indexOf('/api/') === 0) return false;
  return true;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.addAll(SHELL);
      })
      .then(precacheAll)
      .then(function () {
        return self.skipWaiting();
      })
      .catch(function () {
        return self.skipWaiting();
      }),
  );
});

/**
 * Cache every build asset so unvisited routes work offline too.
 * Best-effort: one bad file must not fail the install. Fetched in small
 * parallel batches — 200+ sequential round-trips would keep the worker in
 * "installing" for a minute, during which it controls nothing.
 */
var PRECACHE_BATCH = 6;

function precacheAll() {
  return fetch('/try/asset-manifest.json')
    .then(function (res) {
      if (!res.ok) return [];
      return res.json();
    })
    .catch(function () {
      return [];
    })
    .then(function (files) {
      if (!Array.isArray(files) || files.length === 0) return;
      return caches.open(CACHE).then(function (cache) {
        var queue = files.slice();
        function batch() {
          var group = queue.splice(0, PRECACHE_BATCH);
          if (group.length === 0) return Promise.resolve();
          return Promise.all(
            group.map(function (path) {
              return cache.add('/try/' + path).catch(function () {
                return null;
              });
            }),
          ).then(batch);
        }
        return batch();
      });
    });
}

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE) return caches.delete(key);
            return Promise.resolve(false);
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (!shouldCache(event.request, url)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put('/try/index.html', copy);
          });
          return res;
        })
        .catch(function () {
          return caches.match('/try/index.html');
        }),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function (hit) {
      if (hit) return hit;
      return fetch(event.request).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return res;
      });
    }),
  );
});
