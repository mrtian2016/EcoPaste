/**
 * 认证相关类型定义
 */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  is_active: number;
  is_superuser: number;
  max_history_items: number;
  created_at: string;
  last_login?: string;
}
