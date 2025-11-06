/**
 * 认证 API
 */
import { getHttpServerUrl, saveToken, syncConfig } from "./syncStore";
import type { AuthResponse, LoginRequest, RegisterRequest } from "./types";

const getHttpBaseUrl = (): string => {
  return getHttpServerUrl();
};

/**
 * 注册用户
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const baseUrl = getHttpBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
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

  // 注册成功后自动登录
  return login({ password: data.password, username: data.username });
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const baseUrl = getHttpBaseUrl();

  // 使用 OAuth2 表单格式
  const formData = new URLSearchParams();
  formData.append("username", data.username);
  formData.append("password", data.password);

  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    body: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "登录失败");
  }

  const authData: AuthResponse = await response.json();

  // 保存 token
  saveToken(authData.access_token);

  return authData;
}

/**
 * 登出
 */
export function logout(): void {
  saveToken(null);
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<any> {
  const baseUrl = getHttpBaseUrl();

  if (!syncConfig.token) {
    throw new Error("未登录");
  }

  const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${syncConfig.token}`,
    },
  });

  if (!response.ok) {
    throw new Error("获取用户信息失败");
  }

  return response.json();
}
