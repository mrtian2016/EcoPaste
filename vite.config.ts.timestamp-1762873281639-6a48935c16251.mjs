// vite.config.ts
import react from "file:///Users/tianjy/projects/EcoPaste/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.20_@types+node@22.18.11_less@4.4.2_sass@1.93.2_stylus@0.62.0_/node_modules/@vitejs/plugin-react/dist/index.js";
import UnoCSS from "file:///Users/tianjy/projects/EcoPaste/node_modules/.pnpm/unocss@0.63.6_postcss@8.5.6_rollup@4.52.5_typescript@5.9.3_vite@5.4.20_@types+node@22.1_c95d78ae2f659bd3fefc1a70c49cec28/node_modules/unocss/dist/vite.mjs";
import { defineConfig } from "file:///Users/tianjy/projects/EcoPaste/node_modules/.pnpm/vite@5.4.20_@types+node@22.18.11_less@4.4.2_sass@1.93.2_stylus@0.62.0/node_modules/vite/dist/node/index.js";
var host = process.env.TAURI_DEV_HOST;
var vite_config_default = defineConfig(async () => ({
  build: {
    chunkSizeWarningLimit: 3e3
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  css: {
    preprocessorOptions: {
      scss: {
        // https://sass-lang.com/documentation/breaking-changes/legacy-js-api/#silencing-warnings
        silenceDeprecations: ["legacy-js-api"]
      }
    }
  },
  plugins: [react(), UnoCSS()],
  resolve: {
    alias: {
      "@": "/src"
    }
  },
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    hmr: host ? {
      host,
      port: 1421,
      protocol: "ws"
    } : void 0,
    host: host || false,
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"]
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdGlhbmp5L3Byb2plY3RzL0Vjb1Bhc3RlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvdGlhbmp5L3Byb2plY3RzL0Vjb1Bhc3RlL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy90aWFuankvcHJvamVjdHMvRWNvUGFzdGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5pbXBvcnQgVW5vQ1NTIGZyb20gXCJ1bm9jc3Mvdml0ZVwiO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcblxuY29uc3QgaG9zdCA9IHByb2Nlc3MuZW52LlRBVVJJX0RFVl9IT1NUO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKGFzeW5jICgpID0+ICh7XG4gIGJ1aWxkOiB7XG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAzMDAwLFxuICB9LFxuICAvLyBWaXRlIG9wdGlvbnMgdGFpbG9yZWQgZm9yIFRhdXJpIGRldmVsb3BtZW50IGFuZCBvbmx5IGFwcGxpZWQgaW4gYHRhdXJpIGRldmAgb3IgYHRhdXJpIGJ1aWxkYFxuICAvL1xuICAvLyAxLiBwcmV2ZW50IHZpdGUgZnJvbSBvYnNjdXJpbmcgcnVzdCBlcnJvcnNcbiAgY2xlYXJTY3JlZW46IGZhbHNlLFxuICBjc3M6IHtcbiAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XG4gICAgICBzY3NzOiB7XG4gICAgICAgIC8vIGh0dHBzOi8vc2Fzcy1sYW5nLmNvbS9kb2N1bWVudGF0aW9uL2JyZWFraW5nLWNoYW5nZXMvbGVnYWN5LWpzLWFwaS8jc2lsZW5jaW5nLXdhcm5pbmdzXG4gICAgICAgIHNpbGVuY2VEZXByZWNhdGlvbnM6IFtcImxlZ2FjeS1qcy1hcGlcIl0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBVbm9DU1MoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IFwiL3NyY1wiLFxuICAgIH0sXG4gIH0sXG4gIC8vIDIuIHRhdXJpIGV4cGVjdHMgYSBmaXhlZCBwb3J0LCBmYWlsIGlmIHRoYXQgcG9ydCBpcyBub3QgYXZhaWxhYmxlXG4gIHNlcnZlcjoge1xuICAgIGhtcjogaG9zdFxuICAgICAgPyB7XG4gICAgICAgICAgaG9zdCxcbiAgICAgICAgICBwb3J0OiAxNDIxLFxuICAgICAgICAgIHByb3RvY29sOiBcIndzXCIsXG4gICAgICAgIH1cbiAgICAgIDogdW5kZWZpbmVkLFxuICAgIGhvc3Q6IGhvc3QgfHwgZmFsc2UsXG4gICAgcG9ydDogMTQyMCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIHdhdGNoOiB7XG4gICAgICAvLyAzLiB0ZWxsIHZpdGUgdG8gaWdub3JlIHdhdGNoaW5nIGBzcmMtdGF1cmlgXG4gICAgICBpZ25vcmVkOiBbXCIqKi9zcmMtdGF1cmkvKipcIl0sXG4gICAgfSxcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1EsT0FBTyxXQUFXO0FBQ2pTLE9BQU8sWUFBWTtBQUNuQixTQUFTLG9CQUFvQjtBQUU3QixJQUFNLE9BQU8sUUFBUSxJQUFJO0FBR3pCLElBQU8sc0JBQVEsYUFBYSxhQUFhO0FBQUEsRUFDdkMsT0FBTztBQUFBLElBQ0wsdUJBQXVCO0FBQUEsRUFDekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUlBLGFBQWE7QUFBQSxFQUNiLEtBQUs7QUFBQSxJQUNILHFCQUFxQjtBQUFBLE1BQ25CLE1BQU07QUFBQTtBQUFBLFFBRUoscUJBQXFCLENBQUMsZUFBZTtBQUFBLE1BQ3ZDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO0FBQUEsRUFDM0IsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSztBQUFBLElBQ1A7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLFFBQVE7QUFBQSxJQUNOLEtBQUssT0FDRDtBQUFBLE1BQ0U7QUFBQSxNQUNBLE1BQU07QUFBQSxNQUNOLFVBQVU7QUFBQSxJQUNaLElBQ0E7QUFBQSxJQUNKLE1BQU0sUUFBUTtBQUFBLElBQ2QsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osT0FBTztBQUFBO0FBQUEsTUFFTCxTQUFTLENBQUMsaUJBQWlCO0FBQUEsSUFDN0I7QUFBQSxFQUNGO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
