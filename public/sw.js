const CACHE_NAME = "dormaura-v1";
const STATIC_ASSETS = [
  "/",
  "/home",
  "/manifest.json",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {
      // Silently fail if some assets are unavailable
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first strategy for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and Supabase/external API calls
  if (
    event.request.method !== "GET" ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {
    return;
  }

  // For navigation requests: network first, fall back to cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/home") || caches.match("/")
      )
    );
    return;
  }

  // For other static assets: cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      }).catch(() => cached);
    })
  );
});

// Push notifications support
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "DormAura", {
      body: data.body || "You have a new notification",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "dormaura-notification",
      data: { url: data.url || "/home" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existingClient = clients.find((c) => c.url.includes(url));
      if (existingClient) return existingClient.focus();
      return self.clients.openWindow(url);
    })
  );
});
