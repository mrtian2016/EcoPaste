import { HappyProvider } from "@ant-design/happy-work-theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSnapshot } from "valtio";
import PrivateRoute from "@/components/PrivateRoute";
import { useWebSocket } from "@/hooks/useWebSocket";
import ClipboardHistory from "@/pages/ClipboardHistory";
import Login from "@/pages/Login";
import { authStore } from "@/stores/auth";
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
const AppContent = ({
  isDark,
  setIsDark,
}: {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
}) => {
  const { token, isAuthenticated } = useSnapshot(authStore);

  // 构建 WebSocket 连接地址
  const getWebSocketUrl = () => {
    const isDev = import.meta.env.DEV;

    let baseUrl: string;

    if (isDev) {
      // 开发环境：使用环境变量
      baseUrl = import.meta.env.VITE_WS_URL || "ws://localhost:5281";
    } else {
      // 生产环境：从地址栏读取 host 和端口
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : "";
      baseUrl = `${protocol}//${host}${port}`;
    }

    // 统一拼接 /api/v1/ws
    return `${baseUrl}/api/v1/ws`;
  };

  const wsServerUrl = getWebSocketUrl();

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
      </HappyProvider>
    </ConfigProvider>
  );
};

const App = () => {
  const [isDark, setIsDark] = useState(false);

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
      <AppContent isDark={isDark} setIsDark={setIsDark} />
    </QueryClientProvider>
  );
};

export default App;
