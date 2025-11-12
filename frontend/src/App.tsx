import { HappyProvider } from "@ant-design/happy-work-theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSnapshot } from "valtio";
import PrivateRoute from "@/components/PrivateRoute";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { useWebSocket } from "@/hooks/useWebSocket";
import ClipboardHistory from "@/pages/ClipboardHistory";
import Login from "@/pages/Login";
import { authStore } from "@/stores/auth";
import { getWebSocketUrl } from "@/utils/api";
import { generateColorVars } from "@/utils/color";

const { defaultAlgorithm, darkAlgorithm } = theme;

// 创建 QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// AppContent 组件 - 在 QueryClientProvider 内部
const AppContent = ({ isDark }: { isDark: boolean }) => {
  const { token, isAuthenticated } = useSnapshot(authStore);

  // 构建 WebSocket 连接地址
  const wsServerUrl = `${getWebSocketUrl()}/api/v1/ws`;

  // 通知权限管理 - 登录后自动请求
  useNotificationPermission({
    autoRequest: isAuthenticated, // 只在登录后请求通知权限
  });

  // WebSocket 连接 - 自动处理剪贴板同步
  useWebSocket({
    enabled: isAuthenticated, // 只有登录后才连接
    serverUrl: wsServerUrl,
    token,
  });

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? darkAlgorithm : defaultAlgorithm,
      }}
    >
      <HappyProvider>
        <AntdApp>
          <PWAUpdatePrompt />
          <BrowserRouter>
            <Routes>
              {/* 登录页面 */}
              <Route element={<Login />} path="/login" />
              {/* 剪贴板历史 - 需要登录 */}
              <Route
                element={
                  <PrivateRoute>
                    <ClipboardHistory />
                  </PrivateRoute>
                }
                path="/"
              />

              {/* 默认重定向 */}
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          </BrowserRouter>
        </AntdApp>
      </HappyProvider>
    </ConfigProvider>
  );
};

const App = () => {
  const [isDark] = useState(false);

  // 初始化时生成 Ant Design 颜色变量
  useEffect(() => {
    generateColorVars();
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent isDark={isDark} />
    </QueryClientProvider>
  );
};

export default App;
