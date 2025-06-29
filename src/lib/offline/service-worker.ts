/// <reference lib="webworker" />

// Service Worker for offline caching
const CACHE_NAME = "restaurant-fin-v1"
const STATIC_CACHE = "restaurant-fin-static-v1"
const API_CACHE = "restaurant-fin-api-v1"

// Assets to cache
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/records",
  "/reports",
  "/users",
  "/auth/signin",
  "/manifest.json",
  "/_next/static/css/app/layout.css",
  "/_next/static/chunks/webpack.js",
  "/_next/static/chunks/main.js",
  "/_next/static/chunks/pages/_app.js",
]

// API routes to cache
const CACHEABLE_APIS = ["/api/income-records", "/api/expense-records", "/api/users", "/api/dashboard"]

// Cast self to ServiceWorkerGlobalScope
const sw = self as unknown as ServiceWorkerGlobalScope

sw.addEventListener("install", (event) => {
  console.log("Service Worker installing...")
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("Caching static assets...")
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.error("Failed to cache some static assets:", err)
        })
      }),
      caches.open(API_CACHE).then(() => {
        console.log("API cache initialized")
      }),
    ]),
  )
  sw.skipWaiting()
})

sw.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  sw.clients.claim()
})

sw.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests for caching
  if (request.method !== "GET") {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request))
})

async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)

  try {
    console.log("Fetching from network:", url.pathname)

    // Try network first
    const networkResponse = await fetch(request.clone())

    // Cache successful responses
    if (networkResponse.ok && CACHEABLE_APIS.some((api) => url.pathname.startsWith(api))) {
      const cache = await caches.open(API_CACHE)
      console.log("Caching API response:", url.pathname)
      cache.put(request.clone(), networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log("Network failed, trying cache:", url.pathname)

    // Network failed, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log("Serving from cache:", url.pathname)
      return cachedResponse
    }

    // Return offline response
    console.log("No cache available, returning offline response")
    return new Response(
      JSON.stringify({
        error: "Offline",
        message: "This request will be synced when online",
        offline: true,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

async function handleStaticRequest(request: Request): Promise<Response> {
  try {
    // Try network first for static assets
    const networkResponse = await fetch(request)

    // Cache the response
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, networkResponse.clone())

    return networkResponse
  } catch (error) {
    // Try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Return basic offline page for navigation requests
    if (request.mode === "navigate") {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Offline - RestaurantFin</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body>
            <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
              <h1>You're Offline</h1>
              <p>Please check your internet connection and try again.</p>
              <button onclick="window.location.reload()">Retry</button>
            </div>
          </body>
        </html>
      `,
        {
          headers: { "Content-Type": "text/html" },
        },
      )
    }

    return new Response("Offline", { status: 503 })
  }
}

// Background sync for queued operations
sw.addEventListener("sync", (event) => {
  console.log("Background sync triggered:", (event as any).tag)
  if ((event as any).tag === "background-sync") {
    event.waitUntil(syncQueuedOperations())
  }
})

async function syncQueuedOperations() {
  console.log("Syncing queued operations...")
  const clients = await sw.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_QUEUED_OPERATIONS" })
  })
}

// Handle messages from main thread
sw.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data)

  if (event.data && event.data.type === "SKIP_WAITING") {
    sw.skipWaiting()
  }
})

// Export empty object to make this a module
export {}
