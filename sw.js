// Cache version - increment this when you want to force cache updates
const CACHE_VERSION = "1.0.0";
const CACHE_NAME = `climb-count-v${CACHE_VERSION}`;

// Files to cache with cache-busting strategy
const urlsToCache = [
  "/",
  "/index.html",
  "/app.js",
  "/models/ClimbModel.js",
  "/views/ClimbView.js",
  "/controllers/ClimbController.js",
  "/images/icon-192.png",
  "/images/icon-512.png",
  "/images/icon-large.png",
  "/manifest.json",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  console.log("Service Worker: Install Event");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching Files");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activate Event");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Service Worker: Deleting Old Cache");
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - sophisticated caching strategy
self.addEventListener("fetch", (event) => {
  console.log("Service Worker: Fetch Event for ", event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // If we have a cached response, serve it but also check for updates
          if (cachedResponse) {
            // For app files, use stale-while-revalidate strategy
            if (isAppFile(event.request.url)) {
              // Serve cached version immediately
              fetchAndCache(event.request, cache);
              return cachedResponse;
            }
            // For static assets, serve from cache
            return cachedResponse;
          }

          // No cached version, fetch from network
          return fetchAndCache(event.request, cache);
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline fallback
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      }),
  );
});

// Helper function to identify app files that should use stale-while-revalidate
function isAppFile(url) {
  const appFileExtensions = [".js", ".html", ".css"];
  return (
    appFileExtensions.some((ext) => url.includes(ext)) || url.endsWith("/")
  );
}

// Helper function to fetch and cache responses
function fetchAndCache(request, cache) {
  return fetch(request)
    .then((response) => {
      // Check if we received a valid response
      if (!response || response.status !== 200 || response.type !== "basic") {
        return response;
      }

      // Clone the response since it can only be consumed once
      const responseToCache = response.clone();
      cache.put(request, responseToCache);
      return response;
    })
    .catch((error) => {
      console.log("Fetch failed:", error);
      throw error;
    });
}

// Background sync for offline data
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background Sync", event.tag);
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle any queued climbing data that needs to be synced
  return new Promise((resolve) => {
    // This would sync any offline climbing session data
    // For now, just resolve
    resolve();
  });
}

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

// Handle push notifications (future feature)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push Event");

  const options = {
    body: event.data ? event.data.text() : "Climb Count notification",
    icon: "/images/icon-192.png",
    badge: "/images/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification("Climb Count", options));
});
