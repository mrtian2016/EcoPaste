/**
 * 同步功能 Hook
 */
import { error as LogError } from "@tauri-apps/plugin-log";
import { message } from "antd";
import { useCallback } from "react";
import { useSnapshot } from "valtio";
import { syncEngine } from "../SyncEngine";
import { syncManager } from "../SyncManager";
import { syncConfig, syncState } from "../syncStore";

export const useSync = () => {
  const config = useSnapshot(syncConfig);
  const state = useSnapshot(syncState);

  /**
   * 连接到同步服务器
   */
  const connect = useCallback(async () => {
    if (!config.token) {
      message.error("请先登录");
      return;
    }

    try {
      // 先启用同步引擎（注册回调）
      syncEngine.enable();

      // 连接到服务器（会自动触发 fullSync）
      await syncManager.connect();

      message.success("同步已连接");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "连接失败");
      throw error;
    }
  }, [config.token]);

  /**
   * 断开连接
   */
  const disconnect = useCallback(async () => {
    syncManager.disconnect();
    await syncEngine.disable();
    message.info("同步已断开");
  }, []);

  /**
   * 切换同步开关
   */
  const toggleSync = useCallback(async () => {
    if (config.enabled) {
      await disconnect();
      syncConfig.enabled = false;
    } else {
      if (!config.token) {
        message.warning("请先登录");
        return;
      }

      syncConfig.enabled = true;
      await connect();
    }
  }, [config.enabled, config.token, connect, disconnect]);

  /**
   * 获取在线设备
   */
  const refreshDevices = useCallback(async () => {
    try {
      await syncManager.getOnlineDevices();
    } catch (error) {
      LogError(`获取在线设备失败: ${error}`);
    }
  }, []);

  /**
   * 同步未同步的记录
   */
  const syncPending = useCallback(async () => {
    try {
      const count = await syncEngine.syncPending();
      if (count > 0) {
        message.success(`已同步 ${count} 条记录`);
      } else {
        message.info("没有待同步的记录");
      }
    } catch (_error) {
      message.error("同步失败");
    }
  }, []);

  return {
    // 状态
    config,

    // 方法
    connect,
    disconnect,
    hasError: state.status === "error",
    isConnected: state.status === "connected",
    isConnecting: state.status === "connecting",
    refreshDevices,
    state,
    syncPending,
    toggleSync,
  };
};
