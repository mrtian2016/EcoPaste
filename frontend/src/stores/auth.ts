/**
 * 认证状态管理
 */
import { proxy } from "valtio";
import type { User } from "@/types/auth";

interface AuthStore {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export const authStore = proxy<AuthStore>({
  isAuthenticated: !!localStorage.getItem("token"),
  token: localStorage.getItem("token"),
  user: null,
});

// 设置 token
export const setToken = (token: string) => {
  authStore.token = token;
  authStore.isAuthenticated = true;
  localStorage.setItem("token", token);
};

// 设置用户信息
export const setUser = (user: User) => {
  authStore.user = user;
};

// 登出
export const logout = () => {
  authStore.token = null;
  authStore.user = null;
  authStore.isAuthenticated = false;
  localStorage.removeItem("token");
};
