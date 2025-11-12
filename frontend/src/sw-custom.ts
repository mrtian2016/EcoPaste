/**
 * 自定义 Service Worker
 * 处理通知点击事件和其他 PWA 功能
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// Workbox 配置 - 在 vite-plugin-pwa 中处理
// 此处只添加自定义事件监听器

// 监听通知点击事件
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  const handleClick = async () => {
    try {
      // 获取所有客户端窗口
      const clientList = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      // 如果已有窗口打开，则聚焦到该窗口
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          await (client as WindowClient).focus();
          return;
        }
      }

      // 否则打开新窗口
      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    } catch {
      // 处理通知点击失败,静默处理
    }
  };

  event.waitUntil(handleClick());
});

// 监听通知关闭事件
self.addEventListener("notificationclose", () => {
  // 通知已关闭,可以在这里记录统计信息
});

// 如果需要支持推送通知（Push API），可以添加以下监听器
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();

    const options: NotificationOptions = {
      badge: "/android/android-launchericon-96-96.png",
      body: data.body || "新的剪贴板内容",
      data: { url: data.url || "/" },
      icon: "/android/android-launchericon-192-192.png",
      tag: data.tag || "push-notification",
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "EcoPaste", options),
    );
  } catch {
    // 处理推送消息失败,静默处理
  }
});

// 跳过等待，立即激活新的 Service Worker
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
