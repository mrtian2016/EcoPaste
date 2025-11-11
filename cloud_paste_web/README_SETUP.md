# Cloud Paste Web - 安装指南

与 EcoPaste 桌面版 UI 完全一致的纯 Web 版本。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

### 3. 启动开发服务器

```bash
pnpm dev
```

项目将运行在 `http://localhost:3001`

## 技术栈

### 核心框架
- **React 18.3.1** - UI 框架
- **Vite 5.4.20** - 构建工具
- **TypeScript 5.9.3** - 类型系统

### UI 系统（与 EcoPaste 完全一致）
- **Ant Design 5.27.5** - 主 UI 组件库
- **@ant-design/happy-work-theme** - 主题增强
- **UnoCSS 0.63.6** - 原子化 CSS（替代 Tailwind）
- **SCSS** - CSS 预处理器
- **mac-scrollbar** - 自定义滚动条

### 状态管理
- **Valtio 2.1.8** - 响应式状态管理
- **ahooks 3.9.5** - React Hooks 工具库

### 数据交互
- **Axios 1.6.8** - HTTP 客户端
- **@tanstack/react-query 5.28.0** - 服务端状态管理
- **socket.io-client 4.7.5** - WebSocket 客户端

### 路由
- **React Router DOM 6.27.0** - 客户端路由

### 工具库
- **dayjs** - 日期处理
- **es-toolkit** - 现代 JavaScript 工具库
- **nanoid** - ID 生成
- **i18next** - 国际化

## 项目结构

```
cloud_paste_web/
├── src/
│   ├── api/                 # API 层
│   │   ├── client.ts       # Axios 配置
│   │   └── websocket.ts    # WebSocket 封装
│   ├── components/         # UI 组件（可从 EcoPaste 复制）
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义 Hooks
│   ├── stores/             # Valtio 状态管理
│   ├── utils/              # 工具函数
│   ├── styles/             # 全局样式
│   │   └── global.scss     # 全局 SCSS
│   ├── App.tsx             # 根组件
│   └── main.tsx            # 入口文件
├── uno.config.ts           # UnoCSS 配置
├── vite.config.ts          # Vite 配置
└── tsconfig.json           # TypeScript 配置
```

## 与 EcoPaste 桌面版的区别

### 移除的功能
- ❌ Tauri API（窗口管理、系统托盘等）
- ❌ 本地 SQLite 数据库
- ❌ 全局快捷键（桌面级）
- ❌ 系统剪贴板监听

### 替换的技术
| 桌面版 | Web 版 | 说明 |
|--------|--------|------|
| `invoke('command')` | `apiClient.get('/api/...')` | Tauri 命令改为 HTTP API |
| Tauri 事件系统 | Socket.IO | 实时通信 |
| 本地 SQLite | RESTful API | 数据存储 |
| HashRouter | BrowserRouter | 路由方式 |

### 保留的功能（UI 完全一致）
- ✅ 所有 UI 组件和样式
- ✅ 明暗主题切换
- ✅ 国际化支持
- ✅ 响应式布局
- ✅ 虚拟列表渲染

## API 集成示例

### HTTP 请求示例

```typescript
// src/api/endpoints/clipboard.ts
import { apiClient } from "../client";

export const clipboardApi = {
  getHistory: (params: { page: number; limit: number }) =>
    apiClient.get("/clipboard/history", { params }),

  addItem: (data: any) =>
    apiClient.post("/clipboard/items", data),
};
```

### React Query Hook 示例

```typescript
// src/hooks/useClipboard.ts
import { useQuery } from "@tanstack/react-query";
import { clipboardApi } from "@/api/endpoints/clipboard";

export const useClipboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["clipboard"],
    queryFn: () => clipboardApi.getHistory({ page: 1, limit: 50 }),
  });

  return { data, isLoading };
};
```

### WebSocket 示例

```typescript
// src/hooks/useWebSocket.ts
import { useEffect } from "react";
import { wsClient } from "@/api/websocket";

export const useWebSocket = () => {
  useEffect(() => {
    wsClient.connect(import.meta.env.VITE_WS_URL || "ws://localhost:3000");

    wsClient.on("clipboard:new", (data) => {
      console.log("New clipboard item:", data);
    });

    return () => wsClient.disconnect();
  }, []);
};
```

## 从 EcoPaste 复制组件

你可以直接复制 EcoPaste 的以下目录到 Web 版本：

```bash
# 复制通用组件
cp -r ../src/components ./src/

# 复制工具函数（需要移除 Tauri 相关）
cp -r ../src/utils ./src/

# 复制类型定义
cp -r ../src/types ./src/
```

**注意**：需要移除组件中的 Tauri 特定代码：
- `data-tauri-drag-region` 属性
- `@tauri-apps/api` 相关导入
- 窗口管理相关逻辑

## 构建部署

```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

构建产物在 `dist/` 目录，可以部署到任何静态文件服务器。

## 常见问题

### 1. 如何配置后端 API 地址？

修改 `.env` 文件中的 `VITE_API_BASE_URL`。

### 2. 如何添加新的 API 端点？

在 `src/api/endpoints/` 目录下创建新文件，使用 `apiClient` 发起请求。

### 3. 主题不生效？

确保已安装 `unocss` 并在 `vite.config.ts` 中正确配置。

## 下一步

1. 创建页面组件（参考 EcoPaste 的 `pages/` 目录）
2. 实现 API 端点
3. 配置路由
4. 添加状态管理

---

**注意**：本项目仅为前端部分，需要配合后端 API 使用。
