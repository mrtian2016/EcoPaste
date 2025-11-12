/**
 * 同步模块类型定义
 */

// ========== WebSocket 消息类型 ==========

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

// ========== 同步配置 ==========

export interface SyncConfig {
  enabled: boolean;
  serverUrl: string;
  token: string | null;
  deviceId: string;
  deviceName: string;
  autoReconnect: boolean;
  reconnectInterval: number; // 毫秒
  heartbeatInterval: number; // 毫秒
  maxSyncSize?: number; // 最大同步文件大小(字节), 0 表示无限制
  allowedFileExtensions?: string[]; // 允许同步的文件后缀名列表(白名单)，为空表示允许所有
}

// ========== 同步状态 ==========

export type SyncStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: string | null;
  error: string | null;
  onlineDevices: OnlineDevice[];
  pendingCount: number; // 未同步条目数
}

export interface OnlineDevice {
  device_id: string;
  device_name: string;
  username: string;
  connected_at: string;
}

// ========== 剪贴板数据类型（对齐后端）==========

export interface ClipboardItem {
  id: string; // nanoid(21)
  type: "text" | "html" | "rtf" | "image" | "files";
  group?: string;
  value: string;
  search?: string;
  count: number;
  width?: number;
  height?: number;
  favorite: number; // 0 或 1
  createTime: string; // ISO 8601
  note?: string;
  subtype?: string;
  device_id?: string;
  device_name?: string;
  content_hash?: string;
  synced?: number; // 0=未同步 1=已同步
  updated_at?: string;
}

// ========== 同步操作类型 ==========

export interface SyncOperation {
  type:
    | "sync"
    | "delete"
    | "delete_batch"
    | "update"
    | "fetch_history"
    | "clear";
  data: any;
  retryCount?: number;
}

// ========== 认证相关 ==========

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  email?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}
