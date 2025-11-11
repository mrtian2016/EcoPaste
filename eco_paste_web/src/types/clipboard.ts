/**
 * 剪贴板数据类型定义（与后端完全一致）
 */

export interface ClipboardItem {
  id: string; // nanoid (21 chars)
  type: "text" | "html" | "rtf" | "image" | "files";
  group?: string;
  value: string; // 内容或文件路径
  search?: string;
  count: number;
  width?: number;
  height?: number;
  favorite: number; // 0 or 1
  createTime: string; // ISO 8601
  note?: string;
  subtype?: string; // code, link 等
  device_id?: string;
  device_name?: string;
  content_hash?: string;
  synced?: number;
  updated_at?: string;

  // 图片类型额外字段
  remote_file_id?: string;
  remote_file_url?: string;
  remote_file_name?: string;

  // 文件列表类型
  remote_files?: string; // JSON string

  // WebSocket 推送标记
  is_duplicate?: boolean;
}

export interface ClipboardItemCreate {
  id: string;
  type: string;
  group?: string;
  value: string;
  search?: string;
  count: number;
  width?: number;
  height?: number;
  favorite: number;
  createTime: string;
  note?: string;
  subtype?: string;
  device_id?: string;
  device_name?: string;
}

export interface ClipboardItemUpdate {
  id: string;
  updates: Record<string, any>;
}

export interface ClipboardListResponse {
  total: number;
  page: number;
  page_size: number;
  items: ClipboardItem[];
}

export interface ClipboardListParams {
  page?: number;
  page_size?: number;
  device_id?: string;
  favorite?: boolean;
  search?: string;
  type?: "text" | "html" | "rtf" | "image" | "files"; // 类型筛选
}

export interface ApiResponse {
  success: boolean;
  message: string;
}
