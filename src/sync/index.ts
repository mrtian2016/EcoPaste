/**
 * 同步模块主入口
 *
 * 使用示例:
 * ```typescript
 * import { syncManager, login, logout, syncConfig, syncState } from '@/sync';
 *
 * // 登录
 * await login({ username: 'user', password: 'pass' });
 *
 * // 启用同步并连接
 * syncConfig.enabled = true;
 * await syncManager.connect();
 *
 * // 同步剪贴板
 * await syncManager.syncClipboard(clipboardItem);
 *
 * // 注册回调处理来自其他设备的同步
 * syncManager.onSync((item) => {
 *   console.log('收到同步:', item);
 * });
 * ```
 */

// 导出认证 API
export { getCurrentUser, login, logout, register } from "./authApi";
// 导出数据库包装器
export {
  batchDeleteHistory,
  deleteHistory,
  insertHistory,
  selectHistory,
  updateHistory,
} from "./database-wrapper";
// 导出文件 API
export { downloadFile, uploadFile } from "./fileApi";
// 导出 React Hooks
export { useSync } from "./hooks/useSync";
export { useSyncAuth } from "./hooks/useSyncAuth";
// 导出同步引擎
export { SyncEngine, syncEngine } from "./SyncEngine";
// 导出同步管理器
export { SyncManager, syncManager } from "./SyncManager";
// 导出配置和状态
export {
  getHttpServerUrl,
  isLoggedIn,
  saveToken,
  setAllowedFileExtensions,
  setMaxSyncSize,
  setServerUrl,
  setSyncEnabled,
  syncConfig,
  syncState,
} from "./syncStore";
// 导出类型
export type * from "./types";
export { getDeviceId, getDeviceName, setDeviceName } from "./utils/device";
// 导出工具函数
export { calculateHash, verifyHash } from "./utils/hash";
