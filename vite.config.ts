import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// All URLs relative so `dist/` can be hosted under any sub-path (§3, §13).
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // new SW waits; the app shows a banner; skipWaiting only on Reload (§13)
      manifest: false, // hand-written public/manifest.webmanifest
      workbox: {
        // Precache: app shell, fonts, icons, bundled fallback deck.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}", "data/questions.json"],
        // Never precache the release pointer or version-named content files.
        globIgnores: ["data/manifest.json", "data/questions-*.json", "fonts/OFL.txt"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Immutable, version-named content releases: cache-first.
            urlPattern: ({ url }) => /\/data\/questions-[^/]+\.json$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "content-files", expiration: { maxEntries: 6 } },
          },
          {
            // Release pointer: always from the network (the app adds cache: "no-store" too).
            urlPattern: ({ url }) => url.pathname.endsWith("/data/manifest.json"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
