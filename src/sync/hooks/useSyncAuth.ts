/**
 * 同步认证 Hook
 */
import { error as LogError } from "@tauri-apps/plugin-log";
import { message } from "antd";
import { useCallback, useState } from "react";
import { useSnapshot } from "valtio";
import { getCurrentUser, login, logout, register } from "../authApi";
import { syncManager } from "../SyncManager";
import { isLoggedIn, setSyncEnabled, syncConfig } from "../syncStore";
import type { LoginRequest, RegisterRequest } from "../types";

export const useSyncAuth = () => {
  const config = useSnapshot(syncConfig);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  /**
   * 用户登录
   */
  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    setLoading(true);
    try {
      await login(credentials);
      message.success("登录成功");

      // 获取用户信息
      const userInfo = await getCurrentUser();
      setUser(userInfo);

      // 自动启用同步并连接
      setSyncEnabled(true);
      await syncManager.connect();

      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : "登录失败");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 用户注册
   */
  const handleRegister = useCallback(async (credentials: RegisterRequest) => {
    setLoading(true);
    try {
      await register(credentials);
      message.success("注册成功");

      // 获取用户信息
      const userInfo = await getCurrentUser();
      setUser(userInfo);

      // 自动启用同步并连接
      setSyncEnabled(true);
      await syncManager.connect();

      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : "注册失败");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 用户登出
   */
  const handleLogout = useCallback(() => {
    syncManager.disconnect(true); // 用户主动登出
    logout();
    setUser(null);
    message.success("已登出");
  }, []);

  /**
   * 刷新用户信息
   */
  const refreshUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setUser(null);
      return;
    }

    try {
      const userInfo = await getCurrentUser();
      setUser(userInfo);
    } catch (error) {
      LogError(`获取用户信息失败: ${error}`);
      setUser(null);
    }
  }, []);

  return {
    // 状态
    isLoggedIn: isLoggedIn(),
    loading,

    // 方法
    login: handleLogin,
    logout: handleLogout,
    refreshUser,
    register: handleRegister,
    token: config.token,
    user,
  };
};
