/**
 * API 相关的工具函数
 */

/**
 * 获取 API 基础 URL
 * - 开发环境：可通过 VITE_API_BASE_URL 环境变量指定服务器地址（如 http://localhost:3000）
 * - 生产环境：不设置环境变量，自动使用当前页面的 origin（确保协议正确）
 * 该函数会自动追加 /api/v1 路径
 */
export const getApiBaseUrl = (): string => {
  const serverUrl = import.meta.env.VITE_API_BASE_URL;
  if (serverUrl) {
    return `${serverUrl}/api/v1`;
  }
  // 生产环境：使用当前页面的 origin，确保协议（http/https）和端口正确
  return `${window.location.origin}/api/v1`;
};

/**
 * 获取服务器基础 URL（不包含 /api/v1）
 * 用于构建文件下载等非 API 路径
 * - 开发环境：返回开发服务器地址
 * - 生产环境：返回当前页面的 origin
 */
export const getServerBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || window.location.origin;
};

/**
 * 获取 WebSocket URL
 * 根据当前页面地址栏自动解析：
 * - https:// -> wss://
 * - http:// -> ws://
 * 使用当前页面的 host
 */
export const getWebSocketUrl = (): string => {
  // 如果开发环境指定了 VITE_WS_URL，直接使用
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // 如果开发环境指定了 API 服务器地址，将 http 转换为 ws
  if (import.meta.env.VITE_API_BASE_URL) {
    const serverUrl = import.meta.env.VITE_API_BASE_URL;
    return serverUrl.replace(/^http/, "ws");
  }

  // 生产环境：根据当前页面地址自动解析
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}`;
};
