/// <reference lib="dom" />
/// <reference lib="webworker" />

import {
  BackgroundSyncPlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist"
import type { PrecacheEntry } from "serwist"

declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & {
    __SW_MANIFEST: Array<string | PrecacheEntry>
  }

const apiMutationQueue = new BackgroundSyncPlugin("syncrio-api-mutations", {
  maxRetentionTime: 24 * 60,
})

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "syncrio-pages",
        networkTimeoutSeconds: 3,
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
      handler: new StaleWhileRevalidate({
        cacheName: "syncrio-static-assets",
      }),
    },
    {
      matcher: ({ request }) => ["style", "script", "worker"].includes(request.destination),
      handler: new StaleWhileRevalidate({
        cacheName: "syncrio-runtime-assets",
      }),
    },
    {
      matcher: ({ request }) => ["image", "font"].includes(request.destination),
      handler: new CacheFirst({
        cacheName: "syncrio-media",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 120,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ url, request }) =>
        request.method === "GET" &&
        (url.pathname.startsWith("/api/dashboard/") ||
          url.pathname === "/api/posts" ||
          url.pathname === "/api/social/accounts" ||
          url.pathname.startsWith("/api/analytics/overview")),
      handler: new NetworkFirst({
        cacheName: "syncrio-api-read-cache",
        networkTimeoutSeconds: 4,
      }),
    },
    {
      matcher: ({ url, request }) =>
        ["POST", "PUT", "DELETE"].includes(request.method) &&
        (url.pathname.startsWith("/api/posts") || url.pathname === "/api/social/accounts"),
      handler: new NetworkOnly({
        plugins: [apiMutationQueue],
      }),
    },
  ],
})

serwist.addEventListeners()
