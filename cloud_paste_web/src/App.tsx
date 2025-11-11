import { HappyProvider } from "@ant-design/happy-work-theme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button, ConfigProvider, Space, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import PrivateRoute from "@/components/PrivateRoute";
import ClipboardHistory from "@/pages/ClipboardHistory";
import Login from "@/pages/Login";
import { logout } from "@/stores/auth";
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

const App = () => {
  const [isDark, setIsDark] = useState(false);
  // const { isAuthenticated } = useSnapshot(authStore);

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

              {/* 首页 - 需要登录 */}
              <Route
                element={
                  <PrivateRoute>
                    <div className="flex min-h-screen items-center justify-center bg-color-2 py-6">
                      <div className="mx-auto w-full max-w-3xl px-6">
                        <Space
                          align="center"
                          className="w-full"
                          direction="vertical"
                          size="large"
                        >
                          <h1 className="font-bold text-4xl text-color-1">
                            Cloud Paste Web
                          </h1>
                          <p className="text-color-2">
                            与 EcoPaste UI 完全一致的纯 Web 版本
                          </p>
                          <Space>
                            <Button
                              onClick={() => setIsDark(!isDark)}
                              type="primary"
                            >
                              切换{isDark ? "亮色" : "暗色"}主题
                            </Button>
                            <Link to="/clipboard">
                              <Button type="primary">查看剪贴板历史</Button>
                            </Link>
                            <Button danger onClick={logout}>
                              登出
                            </Button>
                          </Space>
                        </Space>
                      </div>
                    </div>
                  </PrivateRoute>
                }
                path="/"
              />

              {/* 剪贴板历史 - 需要登录 */}
              <Route
                element={
                  <PrivateRoute>
                    <ClipboardHistory />
                  </PrivateRoute>
                }
                path="/clipboard"
              />

              {/* 默认重定向 */}
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          </BrowserRouter>
        </HappyProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
