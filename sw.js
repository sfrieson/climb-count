// Cache version - increment this when you want to force cache updates
const CACHE_VERSION = "2.0.0";
const CACHE_NAME = `climb-count-v${CACHE_VERSION}`;
const STORAGE_PERSISTENCE_KEY = "climb-count-storage-persistent";

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

// Activate event - clean up old caches with storage preservation
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activate Event");
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName.startsWith("climb-count-")
            ) {
              console.log("Service Worker: Deleting Old Cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      }),
      // Ensure storage persistence
      ensureStoragePersistence(),
      // Take control of all pages
      self.clients.claim(),
    ]),
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

// Ensure storage persistence
async function ensureStoragePersistence() {
  try {
    if ("storage" in navigator && "persist" in navigator.storage) {
      const persistent = await navigator.storage.persist();
      console.log("Service Worker: Storage persistence granted:", persistent);

      // Store persistence status
      await caches.open(CACHE_NAME).then((cache) => {
        return cache.put(
          new Request(STORAGE_PERSISTENCE_KEY),
          new Response(JSON.stringify({ persistent, timestamp: Date.now() })),
        );
      });

      return persistent;
    }
  } catch (error) {
    console.error(
      "Service Worker: Failed to request storage persistence:",
      error,
    );
  }
  return false;
}

// Handle data backup requests
async function handleDataBackup(event) {
  try {
    // Open IndexedDB and export data
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("climbCountDB", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const backupData = {
      version: 2,
      timestamp: new Date().toISOString(),
      sessions: await getAllFromStore(db, "sessions"),
      routes: await getAllFromStore(db, "routes"),
      drafts: await getAllFromStore(db, "drafts"),
    };

    // Send backup data back to client
    event.ports[0].postMessage({
      success: true,
      data: JSON.stringify(backupData, null, 2),
    });
  } catch (error) {
    console.error("Service Worker: Backup failed:", error);
    event.ports[0].postMessage({
      success: false,
      error: error.message,
    });
  }
}

// Handle data restore requests
async function handleDataRestore(event) {
  try {
    const backupData = JSON.parse(event.data.backup);

    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("climbCountDB", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Restore each store
    if (backupData.sessions) {
      await restoreToStore(db, "sessions", backupData.sessions);
    }
    if (backupData.routes) {
      await restoreToStore(db, "routes", backupData.routes);
    }
    if (backupData.drafts) {
      await restoreToStore(db, "drafts", backupData.drafts);
    }

    event.ports[0].postMessage({ success: true });
  } catch (error) {
    console.error("Service Worker: Restore failed:", error);
    event.ports[0].postMessage({
      success: false,
      error: error.message,
    });
  }
}

// Helper function to get all records from a store
async function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Helper function to restore data to a store
async function restoreToStore(db, storeName, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    // Clear existing data
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      let completed = 0;
      const total = data.length;

      if (total === 0) {
        resolve();
        return;
      }

      data.forEach((item) => {
        const addRequest = store.add(item);
        addRequest.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        addRequest.onerror = () => reject(addRequest.error);
      });
    };

    clearRequest.onerror = () => reject(clearRequest.error);
  });
}

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }

  // Handle storage backup requests
  if (event.data && event.data.action === "backup-data") {
    handleDataBackup(event);
  }

  // Handle storage restore requests
  if (event.data && event.data.action === "restore-data") {
    handleDataRestore(event);
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
