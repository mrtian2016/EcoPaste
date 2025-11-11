/**
 * 剪贴板 API 端点定义
 */

import type {
  ApiResponse,
  ClipboardItem,
  ClipboardItemCreate,
  ClipboardListParams,
  ClipboardListResponse,
} from "@/types/clipboard";
import { apiClient } from "../client";

export const clipboardApi = {
  /**
   * 批量删除剪贴板项
   */
  batchDelete: (ids: string[]): Promise<ApiResponse> => {
    return apiClient.delete("/clipboard", { data: ids });
  },

  /**
   * 添加剪贴板项
   */
  createItem: (data: ClipboardItemCreate): Promise<ClipboardItem> => {
    return apiClient.post("/clipboard", data);
  },

  /**
   * 删除单个剪贴板项
   */
  deleteItem: (id: string): Promise<ApiResponse> => {
    return apiClient.delete(`/clipboard/${id}`);
  },

  /**
   * 获取单个剪贴板项
   */
  getItem: (id: string): Promise<ClipboardItem> => {
    return apiClient.get(`/clipboard/${id}`);
  },
  /**
   * 获取剪贴板历史列表
   */
  getList: (
    params: ClipboardListParams = {},
  ): Promise<ClipboardListResponse> => {
    return apiClient.get("/clipboard", { params });
  },

  /**
   * 切换收藏状态
   */
  toggleFavorite: (id: string, favorite: number): Promise<ClipboardItem> => {
    return apiClient.put(`/clipboard/${id}`, {
      id,
      updates: { favorite },
    });
  },

  /**
   * 更新剪贴板项
   */
  updateItem: (
    id: string,
    updates: Record<string, any>,
  ): Promise<ClipboardItem> => {
    return apiClient.put(`/clipboard/${id}`, { id, updates });
  },

  /**
   * 更新备注
   */
  updateNote: (id: string, note: string): Promise<ClipboardItem> => {
    return apiClient.put(`/clipboard/${id}`, {
      id,
      updates: { note },
    });
  },
};
