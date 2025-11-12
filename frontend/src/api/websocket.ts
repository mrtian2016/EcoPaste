/**
 * WebSocket 客户端封装 - 使用原生 WebSocket API
 */

export interface WSClientMessage {
  action: string;
  message_id?: string;
  data: any;
}

export interface WSServerMessage {
  type: string;
  message_id?: string;
  source_device_id?: string;
  timestamp?: string;
  data: any;
}

type MessageHandler = (message: WSServerMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: {
    serverUrl: string;
    token: string | null;
    deviceId: string;
    deviceName: string;
    heartbeatInterval: number;
    reconnectInterval: number;
  };
  private handlers: Map<string, MessageHandler> = new Map();
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private pendingMessages: Map<string, (response: WSServerMessage) => void> =
    new Map();
  private manualDisconnect: boolean = false;
  private connectionListeners: Set<() => void> = new Set();
  private disconnectListeners: Set<() => void> = new Set();
  private errorListeners: Set<(error: string) => void> = new Set();

  constructor() {
    this.config = {
      deviceId: this.getOrCreateDeviceId(),
      deviceName: "Web Client",
      heartbeatInterval: 30000, // 30秒
      reconnectInterval: 3000, // 5秒
      serverUrl: "",
      token: null,
    };
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem("device_id", deviceId);
    }
    return deviceId;
  }

  /**
   * 配置 WebSocket 连接
   */
  configure(config: { serverUrl: string; token: string; deviceName?: string }) {
    this.config.serverUrl = config.serverUrl;
    this.config.token = config.token;
    if (config.deviceName) {
      this.config.deviceName = config.deviceName;
    }
  }

  /**
   * 连接 WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (!this.config.token) {
      throw new Error("未登录，无法连接");
    }

    // 连接时清除手动断开标志
    this.manualDisconnect = false;

    const url = `${this.config.serverUrl}?token=${this.config.token}&device_id=${this.config.deviceId}&device_name=${encodeURIComponent(this.config.deviceName)}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.connectionListeners.forEach((listener) => {
            listener();
          });
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSServerMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (_error) {
            // 解析失败，忽略该消息
          }
        };

        this.ws.onerror = (error) => {
          this.errorListeners.forEach((listener) => {
            listener("WebSocket 连接错误");
          });
          reject(error);
        };

        this.ws.onclose = (event) => {
          // 检查是否是认证失败（后端返回 1008）
          if (event.code === 1008) {
            this.errorListeners.forEach((listener) => {
              listener("认证失败：Token 无效或已过期，请重新登录");
            });
          }

          this.disconnectListeners.forEach((listener) => {
            listener();
          });
          this.stopHeartbeat();

          // 只要不是手动断开，就自动重连（但认证失败不重连）
          if (
            !this.manualDisconnect &&
            this.config.token &&
            event.code !== 1008
          ) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.errorListeners.forEach((listener) => {
          listener(error instanceof Error ? error.message : String(error));
        });
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(manual: boolean = true): void {
    this.manualDisconnect = manual;
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
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
    const messageId =
      message.message_id ||
      `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    message.message_id = messageId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error("消息响应超时"));
      }, 10000);

      this.pendingMessages.set(messageId, (response) => {
        clearTimeout(timeout);
        this.pendingMessages.delete(messageId);

        if (response.type === "error") {
          reject(new Error(response.data?.message || "未知错误"));
        } else {
          resolve(response);
        }
      });

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
   * 监听连接事件
   */
  onConnect(listener: () => void): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  /**
   * 监听断开事件
   */
  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  /**
   * 监听错误事件
   */
  onError(listener: (error: string) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WSServerMessage): void {
    // 处理 message_id 响应
    if (message.message_id && this.pendingMessages.has(message.message_id)) {
      const handler = this.pendingMessages.get(message.message_id);
      handler?.(message);
      return;
    }

    // 调用注册的处理器
    const handler = this.handlers.get(message.type);
    if (handler) {
      handler(message);
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
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.stopReconnect();

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(() => {
        if (!this.manualDisconnect && this.config.token) {
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

export const wsClient = new WebSocketClient();
