import { useRegisterSW } from "virtual:pwa-register/react";
import { App } from "antd";
import { useEffect, useState } from "react";

/**
 * PWA 更新提示组件
 * 当检测到新版本时，提示用户刷新应用
 */
export function PWAUpdatePrompt() {
  const { message } = App.useApp();
  const [updatePromptShown, setUpdatePromptShown] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(_error: Error) {
      // Service Worker registration failed
    },
    onRegisteredSW(
      _swUrl: string,
      registration: ServiceWorkerRegistration | undefined,
    ) {
      // 每小时检查一次更新
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      }
    },
  });

  useEffect(() => {
    if (needRefresh && !updatePromptShown) {
      setUpdatePromptShown(true);

      message.info({
        content: "发现新版本！点击刷新以获取最新内容",
        duration: 0,
        key: "pwa-update",
        onClick: () => {
          updateServiceWorker(true);
        },
        onClose: () => {
          setNeedRefresh(false);
          setUpdatePromptShown(false);
        },
      });
    }
  }, [
    needRefresh,
    updatePromptShown,
    message,
    updateServiceWorker,
    setNeedRefresh,
  ]);

  return null;
}
