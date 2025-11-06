/**
 * 同步设置组件
 */

import { Button, Input, message, Space, Tag } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import ProList from "@/components/ProList";
import ProListItem from "@/components/ProListItem";
import ProSwitch from "@/components/ProSwitch";
import {
  getHttpServerUrl,
  login,
  logout,
  register,
  setServerUrl,
  setSyncEnabled,
  syncConfig,
  syncManager,
  syncState,
} from "./index";

export const SyncSettings = () => {
  const { t } = useTranslation();
  const config = useSnapshot(syncConfig);
  const state = useSnapshot(syncState);

  const [serverUrl, setServerUrlInput] = useState(getHttpServerUrl());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  // 处理服务器地址变更
  const handleServerUrlChange = (url: string) => {
    setServerUrlInput(url);
    setServerUrl(url);
  };

  // 处理登录
  const handleLogin = async () => {
    if (!username || !password) {
      message.error(t("preference.sync.sync.hints.input_credentials"));
      return;
    }

    if (!serverUrl) {
      message.error(t("preference.sync.sync.hints.configure_server"));
      return;
    }

    setLoading(true);
    try {
      await login({ password, username });
      message.success(t("preference.sync.sync.message.login_success"));
      setPassword("");

      // 自动启用同步并连接
      setSyncEnabled(true);
      await syncManager.connect();
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t("preference.sync.sync.message.login_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async () => {
    if (!username || !password) {
      message.error(t("preference.sync.sync.hints.input_credentials"));
      return;
    }

    if (!serverUrl) {
      message.error(t("preference.sync.sync.hints.configure_server"));
      return;
    }

    setLoading(true);
    try {
      await register({ password, username });
      message.success(t("preference.sync.sync.message.register_success"));
      setPassword("");
      setIsRegistering(false);

      // 自动启用同步并连接
      setSyncEnabled(true);
      await syncManager.connect();
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t("preference.sync.sync.message.register_failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  // 处理登出
  const handleLogout = () => {
    syncManager.disconnect(true); // 用户主动登出
    logout();
    message.success(t("preference.sync.sync.message.logout_success"));
  };

  // 切换同步开关
  const handleToggleSync = async (value: boolean) => {
    if (value) {
      if (!config.token) {
        message.warning(t("preference.sync.sync.hints.login_first"));
        return;
      }

      try {
        setSyncEnabled(true);
        await syncManager.connect();
        message.success(t("preference.sync.sync.message.sync_enabled"));
      } catch (error) {
        setSyncEnabled(false);
        message.error(
          error instanceof Error
            ? error.message
            : t("preference.sync.sync.message.connect_failed"),
        );
      }
    } else {
      setSyncEnabled(false);
      syncManager.disconnect(false); // 配置变化导致的断开
      message.info(t("preference.sync.sync.message.sync_disabled"));
    }
  };

  // 获取状态标签颜色
  const getStatusColor = () => {
    switch (state.status) {
      case "connected":
        return "green";
      case "connecting":
        return "blue";
      case "error":
        return "red";
      default:
        return "default";
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (state.status) {
      case "connected":
        return t("preference.sync.sync.status.connected");
      case "connecting":
        return t("preference.sync.sync.status.connecting");
      case "error":
        return t("preference.sync.sync.status.error");
      default:
        return t("preference.sync.sync.status.disconnected");
    }
  };

  return (
    <>
      {/* 同步状态 */}
      <ProList header={t("preference.sync.sync.title")}>
        <ProListItem title={t("preference.sync.sync.label.status")}>
          <Tag color={getStatusColor()}>{getStatusText()}</Tag>
        </ProListItem>
        {state.onlineDevices.length > 0 && (
          <ProListItem title={t("preference.sync.sync.label.online_devices")}>
            {state.onlineDevices.length}
          </ProListItem>
        )}
        {state.lastSyncTime && (
          <ProListItem title={t("preference.sync.sync.label.last_sync")}>
            {new Date(state.lastSyncTime).toLocaleString()}
          </ProListItem>
        )}
        {state.error && (
          <ProListItem title={t("preference.sync.sync.label.error")}>
            <span style={{ color: "red" }}>{state.error}</span>
          </ProListItem>
        )}
      </ProList>

      {/* 服务器配置 */}
      <ProList header={t("preference.sync.sync.label.server_address")}>
        <ProListItem
          description={
            <div>
              <Input
                disabled={!!config.token}
                onChange={(e) => handleServerUrlChange(e.target.value)}
                placeholder={t("preference.sync.sync.hints.server_placeholder")}
                style={{ marginTop: "8px" }}
                value={serverUrl}
              />
              <div
                style={{ color: "#999", fontSize: "12px", marginTop: "4px" }}
              >
                {t("preference.sync.sync.hints.server_example")}
              </div>
              {config.token && (
                <div
                  style={{
                    color: "#ff9800",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  {t("preference.sync.sync.hints.server_locked")}
                </div>
              )}
            </div>
          }
          title={t("preference.sync.sync.label.server_address_required")}
        />
      </ProList>

      {/* 账号信息 */}
      <ProList header={t("preference.sync.sync.label.account_info")}>
        {!config.token ? (
          <ProListItem
            description={
              <Space
                direction="vertical"
                style={{ marginTop: "8px", width: "100%" }}
              >
                <Input
                  disabled={!serverUrl}
                  onChange={(e) => setUsername(e.target.value)}
                  onPressEnter={isRegistering ? handleRegister : handleLogin}
                  placeholder={t("preference.sync.sync.label.username")}
                  value={username}
                />
                <Input.Password
                  disabled={!serverUrl}
                  onChange={(e) => setPassword(e.target.value)}
                  onPressEnter={isRegistering ? handleRegister : handleLogin}
                  placeholder={t("preference.sync.sync.label.password")}
                  value={password}
                />
                <Space>
                  <Button
                    disabled={!serverUrl}
                    loading={loading}
                    onClick={isRegistering ? handleRegister : handleLogin}
                    type="primary"
                  >
                    {isRegistering
                      ? t("preference.sync.sync.button.register")
                      : t("preference.sync.sync.button.login")}
                  </Button>
                  <Button onClick={() => setIsRegistering(!isRegistering)}>
                    {isRegistering
                      ? t("preference.sync.sync.button.switch_to_login")
                      : t("preference.sync.sync.button.switch_to_register")}
                  </Button>
                </Space>
                {!serverUrl && (
                  <div style={{ color: "#ff4d4f", fontSize: "12px" }}>
                    {t("preference.sync.sync.hints.configure_server_first")}
                  </div>
                )}
              </Space>
            }
            title={
              isRegistering
                ? t("preference.sync.sync.label.register_account")
                : t("preference.sync.sync.label.login_account")
            }
          />
        ) : (
          <ProListItem
            description={`${config.deviceId.substring(0, 16)}...`}
            title={t("preference.sync.sync.label.device_id")}
          >
            <Button onClick={handleLogout} size="small">
              {t("preference.sync.sync.button.logout")}
            </Button>
          </ProListItem>
        )}
      </ProList>

      {/* 同步控制 */}
      {config.token && (
        <ProList header={t("preference.sync.sync.label.sync_control")}>
          <ProSwitch
            disabled={!config.token}
            onChange={handleToggleSync}
            title={t("preference.sync.sync.label.sync_control")}
            value={config.enabled}
          />
        </ProList>
      )}

      {/* 在线设备列表 */}
      {state.onlineDevices.length > 0 && (
        <ProList header={t("preference.sync.sync.label.online_devices_list")}>
          {state.onlineDevices.map((device) => (
            <ProListItem
              description={
                <div style={{ fontSize: "12px" }}>
                  {t("preference.sync.sync.label.user")}: {device.username} |{" "}
                  {t("preference.sync.sync.label.connected_at")}:{" "}
                  {new Date(device.connected_at).toLocaleString()}
                </div>
              }
              key={device.device_id}
              title={device.device_name || device.device_id.substring(0, 8)}
            />
          ))}
        </ProList>
      )}

      {/* 调试信息 */}
      <ProList header={t("preference.sync.sync.label.debug_info")}>
        <ProListItem
          description={config.deviceName}
          title={t("preference.sync.sync.label.device_name")}
        />
        <ProListItem
          description={config.serverUrl}
          title={t("preference.sync.sync.label.websocket_address")}
        />
        <ProListItem
          description={config.autoReconnect ? "是" : "否"}
          title={t("preference.sync.sync.label.auto_reconnect")}
        />
        <ProListItem
          description={`${config.reconnectInterval}ms`}
          title={t("preference.sync.sync.label.reconnect_interval")}
        />
        <ProListItem
          description={`${config.heartbeatInterval}ms`}
          title={t("preference.sync.sync.label.heartbeat_interval")}
        />
      </ProList>
    </>
  );
};
