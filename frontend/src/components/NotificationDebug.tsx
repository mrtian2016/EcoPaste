/**
 * 通知调试组件 - 用于测试和调试通知功能
 */
import { Alert, Button, Card, Space, Tag } from "antd";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import {
  isIOSDevice,
  isStandalonePWA,
  sendClipboardSyncNotification,
} from "@/utils/notification";

export const NotificationDebug = () => {
  const {
    isSupported,
    permission,
    isGranted,
    isRequesting,
    hasRequestedBefore,
    requestPermission,
  } = useNotificationPermission();

  const isIOS = isIOSDevice();
  const isPWA = isStandalonePWA();
  const isHTTPS = window.location.protocol === "https:";
  const isLocalhost = window.location.hostname === "localhost";

  const handleTestNotification = async () => {
    await sendClipboardSyncNotification("text", "这是一条测试通知的内容");
  };

  return (
    <Card
      extra={
        <Tag color={isGranted ? "success" : "default"}>
          {isGranted ? "已授权" : "未授权"}
        </Tag>
      }
      size="small"
      style={{ margin: 16 }}
      title="通知功能调试"
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        {/* iOS 特殊提示 */}
        {isIOS && !isPWA && (
          <Alert
            description={
              <div>
                在 iPhone/iPad 上使用通知功能需要:
                <ol style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>使用 HTTPS 协议访问 (当前: {isHTTPS ? "✅" : "❌"})</li>
                  <li>点击分享按钮，选择"添加到主屏幕"</li>
                  <li>从主屏幕启动应用 (当前: {isPWA ? "✅" : "❌"})</li>
                  <li>iOS 版本需要 16.4 或更高</li>
                </ol>
              </div>
            }
            message="iOS 设备提示"
            showIcon
            type="warning"
          />
        )}

        {/* 非 HTTPS 提示 */}
        {!isHTTPS && !isLocalhost && (
          <Alert
            description="通知功能需要在 HTTPS 环境下运行。请使用 ngrok 或 Cloudflare Tunnel 创建 HTTPS 隧道。"
            message="需要 HTTPS"
            showIcon
            type="error"
          />
        )}

        <div>
          <strong>设备类型:</strong> <Tag>{isIOS ? "iOS" : "其他"}</Tag>
        </div>
        <div>
          <strong>运行模式:</strong>{" "}
          <Tag color={isPWA ? "success" : "default"}>
            {isPWA ? "独立 PWA" : "浏览器"}
          </Tag>
        </div>
        <div>
          <strong>协议:</strong>{" "}
          <Tag color={isHTTPS || isLocalhost ? "success" : "error"}>
            {window.location.protocol}
          </Tag>
        </div>
        <div>
          <strong>浏览器支持:</strong>{" "}
          {isSupported ? (
            <Tag color="success">支持</Tag>
          ) : (
            <Tag color="error">不支持</Tag>
          )}
        </div>
        <div>
          <strong>权限状态:</strong> <Tag>{permission}</Tag>
        </div>
        <div>
          <strong>曾请求过:</strong>{" "}
          {hasRequestedBefore ? (
            <Tag color="blue">是</Tag>
          ) : (
            <Tag color="default">否</Tag>
          )}
        </div>
        <div>
          <strong>请求中:</strong>{" "}
          {isRequesting ? <Tag color="processing">是</Tag> : <Tag>否</Tag>}
        </div>
        <Space>
          <Button
            disabled={!isSupported || isRequesting}
            loading={isRequesting}
            onClick={requestPermission}
            type="primary"
          >
            请求通知权限
          </Button>
          <Button disabled={!isGranted} onClick={handleTestNotification}>
            测试发送通知
          </Button>
          <Button
            danger
            onClick={() => {
              localStorage.removeItem("notification_permission_requested");
              window.location.reload();
            }}
          >
            重置状态
          </Button>
        </Space>
      </Space>
    </Card>
  );
};
