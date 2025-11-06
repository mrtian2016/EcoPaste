/**
 * 同步管理器 - 核心同步逻辑
 */
import { info as LogInfo } from "@tauri-apps/plugin-log";
import { broadcastSyncState, syncConfig, syncState } from "./syncStore";
import type { ClipboardItem, WSServerMessage } from "./types";
import { WebSocketClient } from "./WebSocketClient";

export class SyncManager {
  private wsClient: WebSocketClient;
  private onClipboardSync?: (item: ClipboardItem) => void;
  private onClipboardDelete?: (id: string) => void;
  private onClipboardBatchDelete?: (ids: string[]) => void;
  private onClipboardUpdate?: (
    id: string,
    updates: Partial<ClipboardItem>,
  ) => void;
  private onHistoryCleared?: () => void;
  private onTimestampUpdated?: (id: string, createTime: string) => void;
  private onConnectedCallback?: () => void;

  constructor() {
    this.wsClient = new WebSocketClient(syncConfig);
    this.setupMessageHandlers();
  }

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers(): void {
    LogInfo("[SyncManager] 注册消息处理器");

    // 剪贴板同步（来自其他设备）
    this.wsClient.on("clipboard_sync", (message: WSServerMessage) => {
      LogInfo(
        `[SyncManager] clipboard_sync 处理器被调用: ${JSON.stringify(message)}`,
      );
      const item = message.data?.clipboard_item as ClipboardItem;
      LogInfo(`[SyncManager] 提取的 item: ${JSON.stringify(item)}`);
      LogInfo(
        `[SyncManager] onClipboardSync 回调存在: ${!!this.onClipboardSync}`,
      );
      if (item && this.onClipboardSync) {
        LogInfo("[SyncManager] 调用 onClipboardSync 回调");
        this.onClipboardSync(item);
      }
      syncState.lastSyncTime = new Date().toISOString();
      broadcastSyncState();
    });

    // 剪贴板删除通知
    this.wsClient.on("clipboard_deleted", (message: WSServerMessage) => {
      const id = message.data?.id;
      if (id && this.onClipboardDelete) {
        this.onClipboardDelete(id);
      }
      syncState.lastSyncTime = new Date().toISOString();
      broadcastSyncState();
    });

    // 批量删除通知
    this.wsClient.on("clipboard_deleted_batch", (message: WSServerMessage) => {
      const ids = message.data?.ids;
      if (ids && this.onClipboardBatchDelete) {
        this.onClipboardBatchDelete(ids);
      }
      syncState.lastSyncTime = new Date().toISOString();
      broadcastSyncState();
    });

    // 剪贴板更新通知
    this.wsClient.on("clipboard_updated", (message: WSServerMessage) => {
      const { id, updates } = message.data || {};
      if (id && updates && this.onClipboardUpdate) {
        this.onClipboardUpdate(id, updates);
      }
      syncState.lastSyncTime = new Date().toISOString();
      broadcastSyncState();
    });

    // 历史清空通知
    this.wsClient.on("history_cleared", (_message: WSServerMessage) => {
      if (this.onHistoryCleared) {
        this.onHistoryCleared();
      }
      syncState.lastSyncTime = new Date().toISOString();
      broadcastSyncState();
    });

    // 时间戳更新通知
    this.wsClient.on("timestamp_updated", (message: WSServerMessage) => {
      const { id, createTime } = message.data?.clipboard_item || {};
      if (id && createTime && this.onTimestampUpdated) {
        this.onTimestampUpdated(id, createTime);
      }
      syncState.lastSyncTime = new Date().toISOString();
      broadcastSyncState();
    });

    // 心跳响应
    this.wsClient.on("pong", (_message: WSServerMessage) => {
      LogInfo("[SyncManager] 收到心跳响应 pong");
    });
  }

  /**
   * 连接到服务器
   */
  async connect(): Promise<void> {
    await this.wsClient.connect();
    // 连接成功后触发回调
    if (this.onConnectedCallback) {
      this.onConnectedCallback();
    }
  }

  /**
   * 断开连接
   * @param manual - 是否为用户主动断开（默认true）
   */
  disconnect(manual: boolean = true): void {
    this.wsClient.disconnect(manual);
  }

  /**
   * 同步剪贴板项
   */
  async syncClipboard(item: ClipboardItem): Promise<void> {
    const response = await this.wsClient.sendAndWait({
      action: "sync_clipboard",
      data: item,
    });

    if (response.type === "sync_confirmed") {
      LogInfo(`剪贴板同步成功: ${JSON.stringify(response.data)}`);
      syncState.lastSyncTime = new Date().toISOString();
      broadcastSyncState();
    }
  }

  /**
   * 删除剪贴板项
   */
  async deleteClipboard(id: string): Promise<void> {
    await this.wsClient.sendAndWait({
      action: "delete_clipboard",
      data: { id },
    });
  }

  /**
   * 批量删除剪贴板项
   */
  async deleteClipboardBatch(ids: string[]): Promise<void> {
    await this.wsClient.sendAndWait({
      action: "delete_clipboard_batch",
      data: { ids },
    });
  }

  /**
   * 更新剪贴板项
   */
  async updateClipboard(
    id: string,
    updates: Partial<ClipboardItem>,
  ): Promise<void> {
    await this.wsClient.sendAndWait({
      action: "update_clipboard",
      data: { id, updates },
    });
  }

  /**
   * 获取历史记录
   */
  async fetchHistory(options?: {
    since?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; has_more: boolean; items: ClipboardItem[] }> {
    const response = await this.wsClient.sendAndWait({
      action: "fetch_history",
      data: {
        limit: options?.limit || 100,
        offset: options?.offset || 0,
        since: options?.since,
      },
    });

    return response.data as {
      total: number;
      has_more: boolean;
      items: ClipboardItem[];
    };
  }

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    await this.wsClient.sendAndWait({
      action: "clear_history",
      data: { confirm: true },
    });
  }

  /**
   * 获取在线设备
   */
  async getOnlineDevices(): Promise<void> {
    await this.wsClient.sendAndWait({
      action: "get_online_devices",
      data: {},
    });
  }

  /**
   * 注册剪贴板同步回调
   */
  onSync(callback: (item: ClipboardItem) => void): void {
    this.onClipboardSync = callback;
  }

  /**
   * 注册删除回调
   */
  onDelete(callback: (id: string) => void): void {
    this.onClipboardDelete = callback;
  }

  /**
   * 注册批量删除回调
   */
  onBatchDelete(callback: (ids: string[]) => void): void {
    this.onClipboardBatchDelete = callback;
  }

  /**
   * 注册更新回调
   */
  onUpdate(
    callback: (id: string, updates: Partial<ClipboardItem>) => void,
  ): void {
    this.onClipboardUpdate = callback;
  }

  /**
   * 注册历史清空回调
   */
  onClearHistory(callback: () => void): void {
    this.onHistoryCleared = callback;
  }

  /**
   * 注册时间戳更新回调
   */
  onTimestampUpdate(callback: (id: string, createTime: string) => void): void {
    this.onTimestampUpdated = callback;
  }

  /**
   * 注册连接成功回调
   */
  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  async syncPending(): Promise<void> {
    await this.wsClient.sendAndWait({
      action: "sync_pending",
      data: {},
    });
  }
}

// 导出单例
export const syncManager = new SyncManager();
