/**
 * 通知权限管理 Hook
 */
import { useCallback, useEffect, useState } from "react";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "@/utils/notification";

interface UseNotificationPermissionOptions {
  autoRequest?: boolean; // 是否自动请求权限
}

export const useNotificationPermission = (
  options: UseNotificationPermissionOptions = {},
) => {
  const { autoRequest = false } = options;
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission(),
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequestedBefore, setHasRequestedBefore] = useState(() => {
    return localStorage.getItem("notification_permission_requested") === "true";
  });

  // 请求通知权限
  const requestPermission = useCallback(async () => {
    if (!isNotificationSupported()) {
      return "denied";
    }

    setIsRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      localStorage.setItem("notification_permission_requested", "true");
      setHasRequestedBefore(true);
      return result;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  // 自动请求权限（如果启用且未请求过）
  useEffect(() => {
    // console.log("通知权限检查:", {
    //   autoRequest,
    //   hasRequestedBefore,
    //   isSupported: isNotificationSupported(),
    //   permission,
    // });

    if (autoRequest && !hasRequestedBefore && permission === "default") {
      // console.log("将在 3 秒后自动请求通知权限...");
      // 延迟一点时间再请求，避免用户刚进入就弹窗
      const timer = setTimeout(() => {
        // console.log("触发通知权限请求");
        requestPermission();
      }, 3000); // 3秒后请求

      return () => clearTimeout(timer);
    }
  }, [autoRequest, hasRequestedBefore, permission, requestPermission]);

  return {
    hasRequestedBefore,
    isGranted: permission === "granted",
    isRequesting,
    isSupported: isNotificationSupported(),
    permission,
    requestPermission,
  };
};
