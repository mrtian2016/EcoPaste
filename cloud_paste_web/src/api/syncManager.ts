/**
 * 同步管理器 - 基于 WebSocket 的剪贴板操作
 */
import type { ClipboardItem } from "@/types/clipboard";
import { wsClient } from "./websocket";

class SyncManager {
  /**
   * 同步剪贴板项
   */
  async syncClipboard(item: ClipboardItem): Promise<void> {
    const response = await wsClient.sendAndWait({
      action: "sync_clipboard",
      data: item,
    });

    if (response.type !== "sync_confirmed") {
      throw new Error("剪贴板同步失败");
    }
  }

  /**
   * 删除剪贴板项
   */
  async deleteClipboard(id: string): Promise<void> {
    await wsClient.sendAndWait({
      action: "delete_clipboard",
      data: { id },
    });
  }

  /**
   * 批量删除剪贴板项
   */
  async deleteClipboardBatch(ids: string[]): Promise<void> {
    await wsClient.sendAndWait({
      action: "delete_clipboard_batch",
      data: { ids },
    });
  }

  /**
   * 更新剪贴板项（用于收藏、备注等）
   */
  async updateClipboard(
    id: string,
    updates: Partial<ClipboardItem>,
  ): Promise<void> {
    await wsClient.sendAndWait({
      action: "update_clipboard",
      data: { id, updates },
    });
  }

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    await wsClient.sendAndWait({
      action: "clear_history",
      data: { confirm: true },
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
    const response = await wsClient.sendAndWait({
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
   * 获取在线设备
   */
  async getOnlineDevices(): Promise<void> {
    await wsClient.sendAndWait({
      action: "get_online_devices",
      data: {},
    });
  }
}

// 导出单例
export const syncManager = new SyncManager();
