/**
 * 同步配置和状态管理
 */

import { emit, listen } from "@tauri-apps/api/event";
import {
  error as LogError,
  info as LogInfo,
  warn as LogWarn,
} from "@tauri-apps/plugin-log";
import { hostname } from "@tauri-apps/plugin-os";
import { nanoid } from "nanoid";
import { proxy } from "valtio";
import type { SyncConfig, SyncState } from "./types";

// 生成设备 ID（仅首次运行）
const getDeviceId = (): string => {
  const stored = localStorage.getItem("eco_device_id");
  if (stored) return stored;

  const deviceId = nanoid(8);
  localStorage.setItem("eco_device_id", deviceId);
  return deviceId;
};

// 异步获取设备名称（必须使用 hostname）
const getDeviceName = async (): Promise<string> => {
  // 优先从缓存读取（但不缓存 Unknown Device）
  const cached = localStorage.getItem("eco_device_name");
  if (cached && cached !== "Unknown Device") {
    return cached;
  }

  // 没有有效缓存则调用 hostname 获取
  try {
    const hostName = await hostname();
    if (hostName?.trim()) {
      // 缓存有效的主机名到 localStorage
      localStorage.setItem("eco_device_name", hostName);
      return hostName;
    }
    // 主机名为空，返回默认值但不缓存
    LogWarn("主机名为空");
    return "Unknown Device";
  } catch (error) {
    LogError(`获取主机名失败: ${error}`);
    // 获取失败，返回默认值但不缓存，以便下次重试
    return "Unknown Device";
  }
};

// 从 localStorage 获取服务器地址，默认为 localhost
const getServerUrl = (): string => {
  const stored = localStorage.getItem("eco_server_url");
  return stored || "http://localhost:8000";
};

// 从 HTTP 地址生成 WebSocket 地址
const getWebSocketUrl = (httpUrl: string): string => {
  const url = httpUrl
    .replace(/^http:\/\//, "ws://")
    .replace(/^https:\/\//, "wss://");
  // 移除尾部斜杠
  const baseUrl = url.replace(/\/$/, "");
  return `${baseUrl}/api/v1/ws`;
};

// 从 localStorage 获取同步启用状态
const getSyncEnabled = (): boolean => {
  const stored = localStorage.getItem("eco_sync_enabled");
  return stored === "true";
};

// 同步配置
export const syncConfig = proxy<SyncConfig>({
  autoReconnect: true,
  deviceId: getDeviceId(),
  // 初始化时不读取 Unknown Device，显示 Loading... 等待异步更新
  deviceName: (() => {
    const cached = localStorage.getItem("eco_device_name");
    return cached && cached !== "Unknown Device" ? cached : "Loading...";
  })(),
  enabled: getSyncEnabled(),
  heartbeatInterval: 30000,
  reconnectInterval: 5000,
  serverUrl: getWebSocketUrl(getServerUrl()),
  token: localStorage.getItem("eco_sync_token"),
});

// 同步状态
export const syncState = proxy<SyncState>({
  error: null,
  lastSyncTime: null,
  onlineDevices: [],
  pendingCount: 0,
  status: "disconnected",
});

// 工具函数：保存 token
export const saveToken = (token: string | null) => {
  if (token) {
    localStorage.setItem("eco_sync_token", token);
    syncConfig.token = token;
  } else {
    localStorage.removeItem("eco_sync_token");
    syncConfig.token = null;
  }
};

// 工具函数：检查是否已登录
export const isLoggedIn = (): boolean => {
  return !!syncConfig.token;
};

// 工具函数：设置服务器地址
export const setServerUrl = (httpUrl: string) => {
  // 保存 HTTP 地址到 localStorage
  localStorage.setItem("eco_server_url", httpUrl);
  // 自动生成 WebSocket 地址
  syncConfig.serverUrl = getWebSocketUrl(httpUrl);
};

// 工具函数：获取 HTTP 服务器地址
export const getHttpServerUrl = (): string => {
  return getServerUrl();
};

// 工具函数：设置同步启用状态
export const setSyncEnabled = (enabled: boolean) => {
  localStorage.setItem("eco_sync_enabled", enabled.toString());
  syncConfig.enabled = enabled;
};

// 监听 localStorage 变化，同步其他窗口的配置
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    // 同步 enabled 状态
    if (event.key === "eco_sync_enabled" && event.newValue !== null) {
      syncConfig.enabled = event.newValue === "true";
    }

    // 同步 token 状态
    if (event.key === "eco_sync_token") {
      syncConfig.token = event.newValue;
    }

    // 同步服务器地址
    if (event.key === "eco_server_url" && event.newValue !== null) {
      syncConfig.serverUrl = getWebSocketUrl(event.newValue);
    }
  });
}

// 跨窗口同步 syncState（通过 Tauri 事件）
const SYNC_STATE_EVENT = "sync-state-changed";

// 手动广播状态变化的函数
export const broadcastSyncState = () => {
  if (typeof window !== "undefined") {
    emit(SYNC_STATE_EVENT, {
      error: syncState.error,
      lastSyncTime: syncState.lastSyncTime,
      onlineDevices: syncState.onlineDevices,
      pendingCount: syncState.pendingCount,
      status: syncState.status,
    }).catch((err) => {
      LogWarn(`广播 syncState 失败: ${err}`);
    });
  }
};

// 监听其他窗口的 syncState 变化
if (typeof window !== "undefined") {
  listen<SyncState>(SYNC_STATE_EVENT, (event) => {
    // 直接更新状态，不触发广播
    syncState.status = event.payload.status;
    syncState.lastSyncTime = event.payload.lastSyncTime;
    syncState.error = event.payload.error;
    syncState.onlineDevices = event.payload.onlineDevices;
    syncState.pendingCount = event.payload.pendingCount;
  }).catch((err) => {
    LogWarn(`监听 syncState 事件失败: ${err}`);
  });

  // 清理可能存在的错误缓存
  const cachedDeviceName = localStorage.getItem("eco_device_name");
  if (cachedDeviceName === "Unknown Device") {
    LogInfo("检测到错误的设备名称缓存，正在清理...");
    localStorage.removeItem("eco_device_name");
  }

  // 异步初始化设备名称
  getDeviceName().then((deviceName) => {
    syncConfig.deviceName = deviceName;
  });
}
