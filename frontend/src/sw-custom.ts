/// <reference lib="webworker" />
/**
 * 自定义 Service Worker
 * 处理通知点击事件和其他 PWA 功能
 */

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// 清理过期缓存
cleanupOutdatedCaches();

// 预缓存资源 - self.__WB_MANIFEST 会被 vite-plugin-pwa 自动注入
precacheAndRoute(self.__WB_MANIFEST || []);

// 立即控制所有客户端
self.skipWaiting();
clientsClaim();

// 监听通知点击事件
self.addEventListener("notificationclick", (event: NotificationEvent) => {
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
          await (
            client as WindowClient & { focus(): Promise<WindowClient> }
          ).focus();
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
self.addEventListener("push", (event: PushEvent) => {
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

// 监听来自主线程的消息（用于后台通知）
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  // console.log("[SW] Received message:", event.data);

  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;

    // console.log("[SW] Showing notification:", title, options);

    event.waitUntil(
      self.registration
        .showNotification(title, {
          badge: options.badge || "/android/android-launchericon-96-96.png",
          body: options.body,
          data: options.data,
          icon: options.icon || "/android/android-launchericon-192-192.png",
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false,
          tag: options.tag,
          // @ts-expect-error - vibrate 是标准 API 但 TypeScript 定义不完整
          vibrate: options.vibrate || [200, 100, 200],
        })
        .then(() => {
          // console.log("[SW] Notification shown successfully");
        })
        .catch((_error: unknown) => {
          // console.error("[SW] Failed to show notification:", error);
        }),
    );
  }

  // 跳过等待，立即激活新的 Service Worker
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
