/**
 * WebSocket 客户端封装
 */

import {
  attachConsole,
  error as LogError,
  info as LogInfo,
} from "@tauri-apps/plugin-log";
import { nanoid } from "nanoid";
import { broadcastSyncState, syncState } from "./syncStore";
import type {
  OnlineDevice,
  SyncConfig,
  WSClientMessage,
  WSServerMessage,
} from "./types";

type MessageHandler = (message: WSServerMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: SyncConfig;
  private handlers: Map<string, MessageHandler> = new Map();
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private pendingMessages: Map<string, (response: WSServerMessage) => void> =
    new Map();
  private manualDisconnect: boolean = false; // 标记是否为用户主动断开

  constructor(config: SyncConfig) {
    this.config = config;
  }

  /**
   * 连接 WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    await attachConsole();
    if (!this.config.token) {
      throw new Error("未登录，无法连接");
    }

    // 连接时清除手动断开标志
    this.manualDisconnect = false;

    syncState.status = "connecting";
    syncState.error = null;
    broadcastSyncState();

    const url = `${this.config.serverUrl}?token=${this.config.token}&device_id=${this.config.deviceId}&device_name=${encodeURIComponent(this.config.deviceName)}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          syncState.status = "connected";
          syncState.error = null;
          broadcastSyncState();
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSServerMessage = JSON.parse(event.data);

            LogInfo(`收到 WebSocket 消息: ${JSON.stringify(message)}`);
            this.handleMessage(message);
          } catch (error) {
            LogError(`解析 WebSocket 消息失败: ${error}`);
          }
        };

        this.ws.onerror = (error) => {
          LogError(`WebSocket 错误: ${error}`);
          syncState.error = "WebSocket 连接错误";
          broadcastSyncState();
          reject(error);
        };

        this.ws.onclose = () => {
          syncState.status = "disconnected";
          broadcastSyncState();
          this.stopHeartbeat();

          // 只要不是手动断开，且已登录并开启同步，就自动重连
          if (!this.manualDisconnect && this.shouldAutoReconnect()) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        syncState.status = "error";
        syncState.error =
          error instanceof Error ? error.message : String(error);
        broadcastSyncState();
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   * @param manual - 是否为用户主动断开（默认true）
   */
  disconnect(manual: boolean = true): void {
    this.manualDisconnect = manual;
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    syncState.status = "disconnected";
    broadcastSyncState();
  }

  /**
   * 发送消息
   */
  send(message: WSClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket 未连接");
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * 发送消息并等待响应
   */
  async sendAndWait(message: WSClientMessage): Promise<WSServerMessage> {
    const messageId = message.message_id || nanoid(16);
    message.message_id = messageId;

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error("消息响应超时"));
      }, 10000);

      // 保存回调
      this.pendingMessages.set(messageId, (response) => {
        clearTimeout(timeout);
        this.pendingMessages.delete(messageId);

        if (response.type === "error") {
          reject(new Error(response.data?.message || "未知错误"));
        } else {
          resolve(response);
        }
      });

      // 发送消息
      this.send(message);
    });
  }

  /**
   * 注册消息处理器
   */
  on(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * 取消消息处理器
   */
  off(type: string): void {
    this.handlers.delete(type);
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WSServerMessage): void {
    LogInfo(`[WebSocket] 收到消息: ${JSON.stringify(message)}`);

    // 处理 message_id 响应
    if (message.message_id && this.pendingMessages.has(message.message_id)) {
      const handler = this.pendingMessages.get(message.message_id);
      handler?.(message);
      return;
    }

    // 处理特殊消息类型
    switch (message.type) {
      case "connected":
        this.handleConnected(message);
        break;
      case "online_devices":
        this.handleOnlineDevices(message);
        break;
      default: {
        // 调用注册的处理器
        const handler = this.handlers.get(message.type);
        LogInfo(
          `[WebSocket] 消息类型: ${message.type}, 处理器存在: ${!!handler}`,
        );
        if (handler) {
          LogInfo(
            `[WebSocket] 调用处理器: ${message.type}, data: ${JSON.stringify(message.data)}`,
          );
          handler(message);
        } else {
          LogError(`[WebSocket] 未找到处理器: ${message.type}`);
        }
      }
    }
  }

  /**
   * 处理连接成功消息
   */
  private handleConnected(message: WSServerMessage): void {
    LogInfo(`WebSocket 连接成功: ${JSON.stringify(message.data)}`);

    if (message.data?.online_devices) {
      syncState.onlineDevices = message.data.online_devices;
      broadcastSyncState();
    }
  }

  /**
   * 处理在线设备列表
   */
  private handleOnlineDevices(message: WSServerMessage): void {
    if (message.data?.devices) {
      syncState.onlineDevices = message.data.devices as OnlineDevice[];
      broadcastSyncState();
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          action: "ping",
          data: { timestamp: Date.now() / 1000 },
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 检查是否应该自动重连
   */
  private shouldAutoReconnect(): boolean {
    // 只有在已登录且开启同步时才重连
    return !!(this.config.token && this.config.enabled);
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.stopReconnect();

    // 重连前再次检查是否应该重连
    if (!this.shouldAutoReconnect()) {
      LogInfo("不满足重连条件（未登录或未开启同步），取消重连");
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      LogInfo("尝试重新连接 WebSocket...");
      this.connect().catch((error) => {
        LogError(`重连失败: ${error}`);
        // 重连失败后继续尝试重连（无限重连）
        if (this.shouldAutoReconnect()) {
          this.scheduleReconnect();
        }
      });
    }, this.config.reconnectInterval);
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
