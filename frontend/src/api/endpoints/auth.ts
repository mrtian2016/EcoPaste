/**
 * 认证 API 端点
 */
import type { LoginRequest, RegisterRequest, Token, User } from "@/types/auth";
import { getApiBaseUrl } from "@/utils/api";

// 注意：登录接口需要使用 form-data 格式（OAuth2PasswordRequestForm）
export const authApi = {
  /**
   * 获取当前用户信息
   */
  getCurrentUser: async (token: string): Promise<User> => {
    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new Error("获取用户信息失败");
    }

    return response.json();
  },
  /**
   * 用户登录
   * 注意：后端使用 OAuth2PasswordRequestForm，需要 form-data 格式
   */
  login: async (data: LoginRequest): Promise<Token> => {
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("password", data.password);

    const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
      body: formData,
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "登录失败");
    }

    return response.json();
  },

  /**
   * 用户注册
   */
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "注册失败");
    }

    return response.json();
  },
};
