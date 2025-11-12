import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./styles/global.scss";
import "mac-scrollbar/dist/mac-scrollbar.css";
import { registerSW } from "virtual:pwa-register";

// vite-plugin-pwa 自动注册 Service Worker
// updateSW 可用于手动触发更新
registerSW({
  onNeedRefresh() {
    // 有新版本可用
    // console.log("New content available, please refresh.");
  },
  onOfflineReady() {
    // 应用已准备好离线工作
    // console.log("App ready to work offline.");
  },
});

// 监听来自 Service Worker 的消息
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    // 处理来自 Service Worker 的消息
    if (event.data && event.data.type === "NOTIFICATION_CLICKED") {
      // 通知被点击，可以在这里处理导航等逻辑
      // console.log("Notification clicked:", event.data);
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
