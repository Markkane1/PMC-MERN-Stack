/* eslint-disable no-restricted-globals */

// Cache version
const CACHE_NAME = "pwa-cache-v277"; // Increment version to force cache update
const STORE_NAME = "offline-requests";
const DB_NAME = "OfflineDB";
const API_CACHE_NAME = "api-cache";

// ✅ Files to Cache for Offline Support
const CACHE_FILES = [
    "/",
    "/index.html",
    "/img/logo/icon-192x192.png",
    "/img/logo/icon-512x512.png",
    "/img/flyers/a.jpg",
    "/img/flyers/b.jpg",
    "/favicon.ico",
    "/manifest.json",
    "/pub",
    "/mis-directory",
    "/mis/clubs/directory",
    "/mis/recycling-efficiency",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/auth/mis/directory",
    "/auth/mis/clubs/directory",
    "/auth/EPAOperations/AllInspections",
    "/auth/EPAOperations/ReportViolation",
    "/auth/EPAOperation/Dashboard",
    "/auth/mis/recycling-efficiency",
    "/home",
    "/home-license",
    "/home-super",
    "/home-deo",
    "/home-admin",
    "/home-do",
    "/track-application",
    "/reset-password",
    "/error",
    "/single-menu-view",
    "/collapse-menu-item-view-1",
    "/collapse-menu-item-view-2",
    "/collapse-menu-item-view-3",
    "/group-single-menu-item-view",
    "/group-collapse-menu-item-view-1",
    "/group-collapse-menu-item-view-2",
    "/analytics1",
    "/spuid-signup",
    "/spuid-review",
    "/robots.txt",
    "/sitemap.xml",
];

// ✅ Install Event - Cache Static Assets
self.addEventListener("install", async (event) => {
    console.log("🚀 Service Worker installing...");

    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                const cachePromises = CACHE_FILES.map(async (file) => {
                    try {
                        const response = await fetch(file, { cache: "no-store" });
                        if (!response.ok) throw new Error(`Failed to fetch ${file}`);
                        await cache.put(file, response);
                    } catch (error) {
                        console.error(`[❌ Cache Error] Could not cache: ${file}`, error.message);
                    }
                });

                await Promise.all(cachePromises);
                console.log("✅ All files cached successfully!");

            } catch (err) {
                console.error("[❌ Service Worker Install Failed]", err.message);
            }
        })()
    );

    self.skipWaiting();
});


self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    if (event.request.method !== "GET") return;

    const allowedStaticTypes = [
        ".js",
        ".css",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".webp",
        ".woff2",
        ".woff",
        ".ttf",
    ];
    const isStaticFile = allowedStaticTypes.some((ext) =>
        requestUrl.pathname.endsWith(ext),
    );

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put("/index.html", responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match("/index.html")),
        );
        return;
    }

    if (isStaticFile) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                        return networkResponse;
                    })
                    .catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            }),
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            })
            .catch(() => caches.match(event.request)),
    );
});

self.addEventListener("activate", (event) => {
    console.log("Service Worker activating...");
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log("Deleting old cache:", cache);
                        return caches.delete(cache);
                    }
                })
            )
        )
    );

    self.clients.claim(); // ✅ Take control of open pages
    self.clients.matchAll().then(clients => {
        clients.forEach(client => client.navigate(client.url)); // ✅ Force reload on activation
    });
});