import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./styles/global.scss";
import "mac-scrollbar/dist/mac-scrollbar.css";

// 注册 Service Worker 并添加通知点击事件监听
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Service Worker 注册成功
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // 有新的 Service Worker 可用
            }
          });
        }
      });
    });

    // 监听来自 Service Worker 的消息
    navigator.serviceWorker.addEventListener("message", (event) => {
      // 处理来自 Service Worker 的消息
      if (event.data && event.data.type === "NOTIFICATION_CLICKED") {
        // 通知被点击，可以在这里处理导航等逻辑
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
