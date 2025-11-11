import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

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
  plugins: [react(), UnoCSS()],
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
