import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 3000,
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["legacy-js-api"],
      },
    },
  },
  plugins: [
    react(),
    UnoCSS(),
    VitePWA({
      devOptions: {
        enabled: true,
        navigateFallback: "index.html",
        type: "module",
      },
      includeAssets: [
        "ios/180.png",
        "android/android-launchericon-192-192.png",
        "android/android-launchericon-512-512.png",
      ],
      manifest: {
        background_color: "#ffffff",
        categories: ["productivity", "utilities"],
        description:
          "跨设备云剪贴板管理工具，支持文本、图片、文件等多种内容类型的同步",
        display: "standalone",
        icons: [
          // Android 图标
          {
            sizes: "48x48",
            src: "android/android-launchericon-48-48.png",
            type: "image/png",
          },
          {
            sizes: "72x72",
            src: "android/android-launchericon-72-72.png",
            type: "image/png",
          },
          {
            sizes: "96x96",
            src: "android/android-launchericon-96-96.png",
            type: "image/png",
          },
          {
            sizes: "144x144",
            src: "android/android-launchericon-144-144.png",
            type: "image/png",
          },
          {
            purpose: "any",
            sizes: "192x192",
            src: "android/android-launchericon-192-192.png",
            type: "image/png",
          },
          {
            purpose: "any",
            sizes: "512x512",
            src: "android/android-launchericon-512-512.png",
            type: "image/png",
          },
          // iOS 图标
          {
            purpose: "any",
            sizes: "180x180",
            src: "ios/180.png",
            type: "image/png",
          },
          {
            purpose: "maskable",
            sizes: "512x512",
            src: "ios/512.png",
            type: "image/png",
          },
        ],
        lang: "zh-CN",
        name: "EcoPaste - 云剪贴板",
        orientation: "portrait",
        scope: "/",
        short_name: "EcoPaste",
        start_url: "/",
        theme_color: "#1890ff",
      },
      registerType: "autoUpdate",
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // 添加对通知点击事件的支持
        // 排除 /api 路径，不让 Service Worker 缓存 API 请求
        navigateFallbackDenylist: [/^\/api/],
        // 不缓存 API 请求，避免出现协议和域名问题
        runtimeCaching: [
          {
            handler: "CacheFirst",
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: "google-fonts-cache",
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                maxEntries: 10,
              },
            },
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          },
          {
            handler: "CacheFirst",
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                maxEntries: 10,
              },
            },
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          },
          // 移除 API 缓存配置，API 请求应该直接通过网络，不经过 Service Worker
          {
            handler: "CacheFirst",
            options: {
              cacheableResponse: {
                statuses: [0, 200],
              },
              cacheName: "images-cache",
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                maxEntries: 50,
              },
            },
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/i,
          },
        ],
        skipWaiting: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        changeOrigin: true,
        target: "http://localhost:3000",
      },
    },
  },
});
