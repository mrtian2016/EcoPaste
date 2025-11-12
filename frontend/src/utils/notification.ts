/**
 * PWA 通知工具函数
 */

export interface NotificationConfig {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  vibrate?: number[];
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * 检查是否为 iOS 设备
 */
export const isIOSDevice = (): boolean => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

/**
 * 检查是否为独立运行的 PWA (已添加到主屏幕)
 */
export const isStandalonePWA = (): boolean => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error - iOS specific property
    window.navigator.standalone === true
  );
};

/**
 * 检查是否支持通知
 */
export const isNotificationSupported = (): boolean => {
  // iOS 设备需要满足特殊条件
  if (isIOSDevice()) {
    // iOS 必须是独立 PWA 模式才支持通知
    return "Notification" in window && isStandalonePWA();
  }

  // 其他平台只需要支持 Notification API
  return "Notification" in window && "serviceWorker" in navigator;
};

/**
 * 获取当前通知权限状态
 */
export const getNotificationPermission = (): NotificationPermission => {
  return isNotificationSupported() ? Notification.permission : "denied";
};

/**
 * 请求通知权限
 */
export const requestNotificationPermission =
  async (): Promise<NotificationPermission> => {
    if (!isNotificationSupported()) {
      return "denied";
    }

    // 如果已经授权，直接返回
    if (Notification.permission === "granted") {
      return "granted";
    }

    // 请求权限
    const permission = await Notification.requestPermission();
    return permission;
  };

/**
 * 检查是否可以发送通知
 */
export const canSendNotification = (): boolean => {
  return isNotificationSupported() && Notification.permission === "granted";
};

/**
 * 发送通知（通过 Service Worker）
 */
export const sendNotification = async (
  config: NotificationConfig,
): Promise<void> => {
  if (!canSendNotification()) {
    // console.warn("无法发送通知: 权限未授予或不支持");
    return;
  }

  try {
    // 使用 Service Worker 发送通知（支持后台通知）
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;

      await registration.showNotification(config.title, {
        badge: config.badge || "/android/android-launchericon-96-96.png",
        body: config.body,
        data: config.data,
        icon: config.icon || "/android/android-launchericon-192-192.png",
        requireInteraction: config.requireInteraction || false,
        silent: config.silent || false,
        tag: config.tag,
        // @ts-expect-error - vibrate 是标准 API 但 TypeScript 定义可能不完整
        vibrate: config.vibrate || [200, 100, 200],
      });
    }
  } catch {
    // 发送通知失败,静默处理
  }
};

/**
 * 发送剪贴板同步通知
 */
export const sendClipboardSyncNotification = async (
  clipboardType: string,
  preview?: string,
): Promise<void> => {
  const typeMap: Record<string, string> = {
    files: "文件",
    html: "HTML",
    image: "图片",
    rtf: "富文本",
    text: "文本",
  };

  const typeName = typeMap[clipboardType] || "内容";
  let body = `收到新的${typeName}`;

  // 如果有预览内容，添加到通知中
  if (preview) {
    const maxLength = 50;
    const truncatedPreview =
      preview.length > maxLength
        ? `${preview.slice(0, maxLength)}...`
        : preview;
    body += `\n${truncatedPreview}`;
  }

  await sendNotification({
    body,
    data: {
      timestamp: Date.now(),
      type: "clipboard_sync",
    },
    tag: "clipboard-sync",
    title: "剪贴板同步",
  });
};

/**
 * 关闭特定标签的通知
 */
export const closeNotification = async (tag: string): Promise<void> => {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const notifications = await registration.getNotifications({ tag });

    for (const notification of notifications) {
      notification.close();
    }
  }
};

/**
 * 关闭所有通知
 */
export const closeAllNotifications = async (): Promise<void> => {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const notifications = await registration.getNotifications();

    for (const notification of notifications) {
      notification.close();
    }
  }
};
