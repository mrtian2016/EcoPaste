/**
 * WebSocket Hook - 处理剪贴板同步消息
 */
import { useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useRef, useState } from "react";
import { type WSServerMessage, wsClient } from "@/api/websocket";
import { CLIPBOARD_QUERY_KEY } from "./useClipboardHistory";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface UseWebSocketOptions {
  serverUrl: string;
  token: string | null;
  enabled?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const { serverUrl, token, enabled = true } = options;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const isSetupRef = useRef(false);

  useEffect(() => {
    // 如果未启用或没有 token，断开连接
    if (!enabled || !token) {
      if (wsClient.isConnected()) {
        wsClient.disconnect();
      }
      setStatus("disconnected");
      return;
    }

    // 配置并连接
    const connectWebSocket = async () => {
      try {
        setStatus("connecting");
        setError(null);

        wsClient.configure({
          serverUrl,
          token,
        });

        await wsClient.connect();
        setStatus("connected");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "连接失败");
        message.open({
          content: "WebSocket 连接失败",
          type: "error",
        });
      }
    };

    // 只设置一次消息处理器
    if (!isSetupRef.current) {
      setupMessageHandlers();
      isSetupRef.current = true;
    }

    // 连接
    if (!wsClient.isConnected()) {
      connectWebSocket();
    }

    // 监听连接状态变化
    const unsubscribeConnect = wsClient.onConnect(() => {
      setStatus("connected");
      setError(null);
    });

    const unsubscribeDisconnect = wsClient.onDisconnect(() => {
      setStatus("disconnected");
    });

    const unsubscribeError = wsClient.onError((err) => {
      setStatus("error");
      setError(err);
      // 如果是认证失败，显示错误提示
      if (err.includes("认证失败")) {
        message.open({
          content: "WebSocket 连接失败",
          type: "error",
        });
      }
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
    };
  }, [serverUrl, token, enabled, queryClient]);

  // 设置消息处理器
  const setupMessageHandlers = () => {
    // 剪贴板同步（来自其他设备）
    wsClient.on("clipboard_sync", (msg: WSServerMessage) => {
      // 获取当前设备 ID
      const currentDeviceId = localStorage.getItem("device_id");
      const sourceDeviceId = msg.source_device_id;

      // 如果是来自当前设备的消息，忽略（虽然后端应该已经排除了）
      if (
        sourceDeviceId &&
        currentDeviceId &&
        sourceDeviceId === currentDeviceId
      ) {
        return;
      }

      // 刷新剪贴板列表
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
      message.open({
        content: "收到新的剪贴板内容",
        type: "success",
      });
    });

    // 剪贴板删除通知
    wsClient.on("clipboard_deleted", (_message: WSServerMessage) => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
    });

    // 批量删除通知
    wsClient.on("clipboard_deleted_batch", (_message: WSServerMessage) => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
    });

    // 剪贴板更新通知
    wsClient.on("clipboard_updated", (_message: WSServerMessage) => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
    });

    // 历史清空通知
    wsClient.on("history_cleared", (_msg: WSServerMessage) => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
      message.open({
        content: "剪贴板历史已被清空",
        type: "info",
      });
    });

    // 时间戳更新通知
    wsClient.on("timestamp_updated", (_message: WSServerMessage) => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
    });

    // 心跳响应
    wsClient.on("pong", (_message: WSServerMessage) => {
      // 心跳响应处理
    });
  };

  return {
    disconnect: () => wsClient.disconnect(),
    error,
    isConnected: status === "connected",
    status,
  };
};
