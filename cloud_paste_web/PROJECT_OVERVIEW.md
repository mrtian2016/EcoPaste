# Cloud Paste Web - 项目概览

## 🎯 项目目标

创建一个与 EcoPaste 桌面版 UI **完全一致**的纯 Web 版本，使用 RESTful API 和 WebSocket 与后端交互。

## ✅ 已完成的配置

### 1. 核心架构
- ✅ Vite 7.2.2 + React 18.3.1 + TypeScript 5.9.3
- ✅ 路径别名配置（`@/` -> `src/`）
- ✅ 开发服务器端口：3001
- ✅ API 代理配置（`/api` -> `http://localhost:3000/api`）

### 2. UI 系统（与 EcoPaste 100% 一致）
- ✅ Ant Design 5.27.5
- ✅ @ant-design/happy-work-theme（主题增强）
- ✅ UnoCSS 0.63.6（完全复制 EcoPaste 配置）
- ✅ 明暗主题切换
- ✅ 全局样式（SCSS）
- ✅ mac-scrollbar（自定义滚动条）

### 3. 数据交互层
- ✅ Axios HTTP 客户端（已配置拦截器）
- ✅ Socket.IO WebSocket 封装
- ✅ React Query 服务端状态管理

### 4. 状态管理
- ✅ Valtio（响应式状态）
- ✅ ahooks（React Hooks 工具）

### 5. 其他工具
- ✅ React Router DOM 6.27.0
- ✅ dayjs（日期处理）
- ✅ i18next（国际化）
- ✅ dompurify、react-markdown 等

## 📂 项目结构

```
cloud_paste_web/
├── src/
│   ├── api/                     # ✅ API 层
│   │   ├── client.ts           # ✅ Axios 配置（已完成）
│   │   ├── websocket.ts        # ✅ WebSocket 封装（已完成）
│   │   └── endpoints/          # 📝 API 端点定义（待实现）
│   │
│   ├── components/             # UI 组件
│   │   └── ProList/            # ✅ 示例组件（已完成）
│   │
│   ├── pages/                  # 📝 页面组件（待实现）
│   ├── hooks/                  # 📝 自定义 Hooks（待实现）
│   ├── stores/
│   │   └── global.ts           # ✅ 全局状态（已完成）
│   │
│   ├── utils/
│   │   └── color.ts            # ✅ 工具函数（已完成）
│   │
│   ├── styles/
│   │   └── global.scss         # ✅ 全局样式（已完成）
│   │
│   ├── App.tsx                 # ✅ 根组件（已配置主题）
│   └── main.tsx                # ✅ 入口文件（已配置）
│
├── uno.config.ts               # ✅ UnoCSS 配置（完全复制 EcoPaste）
├── vite.config.ts              # ✅ Vite 配置（已完成）
├── tsconfig.json               # ✅ TypeScript 配置（已完成）
├── package.json                # ✅ 依赖配置（已完成）
│
├── .env.example                # ✅ 环境变量模板
├── INSTALL.md                  # ✅ 安装指南
├── README_SETUP.md             # ✅ 详细配置说明
└── NEXT_STEPS.md               # ✅ 下一步开发指南
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd /Users/tianjy/projects/EcoPaste/cloud_paste_web
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问：`http://localhost:3001`

## 📦 完整依赖列表

### 核心依赖（与 EcoPaste 一致）

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | 18.3.1 | UI 框架 |
| antd | 5.27.5 | UI 组件库 |
| @ant-design/happy-work-theme | 1.0.1 | 主题增强 |
| unocss | 0.63.6 | 原子化 CSS |
| valtio | 2.1.8 | 状态管理 |
| react-router-dom | 6.27.0 | 路由 |
| @tanstack/react-query | 5.28.0 | 服务端状态 |
| axios | 1.6.8 | HTTP 客户端 |
| socket.io-client | 4.7.5 | WebSocket |
| ahooks | 3.9.5 | Hooks 工具 |
| dayjs | 1.11.18 | 日期处理 |
| i18next | 23.16.8 | 国际化 |

## 🎨 UI 样式系统

### UnoCSS 自定义颜色（与 EcoPaste 完全一致）

```typescript
// 使用方式
<div className="bg-color-1 text-color-1 border-color-1">
  内容
</div>

// 可用的颜色类
bg-color-1/2/3/4     // 背景色
text-color-1/2/3     // 文字色
border-color-1/2     // 边框色
text-primary         // 主题色
text-danger          // 危险色
text-success         // 成功色
```

### 主题切换

```typescript
// 在 App.tsx 中已实现
const [isDark, setIsDark] = useState(false);

// 切换主题
setIsDark(!isDark);
```

## 🔌 API 使用示例

### HTTP 请求

```typescript
import { apiClient } from "@/api/client";

// GET 请求
const data = await apiClient.get("/clipboard/history");

// POST 请求
const result = await apiClient.post("/clipboard/items", {
  content: "Hello",
  type: "text",
});
```

### WebSocket

```typescript
import { wsClient } from "@/api/websocket";

// 连接
wsClient.connect("ws://localhost:3000");

// 监听事件
wsClient.on("clipboard:new", (data) => {
  console.log("New item:", data);
});

// 发送事件
wsClient.emit("clipboard:subscribe", { userId: "123" });
```

### React Query

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

const { data, isLoading } = useQuery({
  queryKey: ["clipboard"],
  queryFn: () => apiClient.get("/clipboard/history"),
});
```

## 🔄 与 EcoPaste 的对比

### 保留的功能（UI 完全一致）
- ✅ 所有 UI 组件和样式
- ✅ UnoCSS 配置
- ✅ Ant Design 主题
- ✅ 明暗主题切换
- ✅ 国际化支持
- ✅ 虚拟列表渲染
- ✅ 自定义滚动条

### 移除的功能（桌面特有）
- ❌ Tauri API
- ❌ 窗口管理
- ❌ 系统托盘
- ❌ 全局快捷键
- ❌ 本地 SQLite

### 替换的技术

| EcoPaste 桌面版 | Cloud Paste Web 版 |
|----------------|-------------------|
| Tauri `invoke()` | Axios `apiClient` |
| Tauri 事件系统 | Socket.IO |
| 本地 SQLite | RESTful API |
| HashRouter | BrowserRouter |
| 系统剪贴板监听 | WebSocket 推送 |

## 📋 下一步任务清单

### 优先级 P0（必须完成）
- [ ] 创建主要页面（Home、Settings 等）
- [ ] 实现 API 端点定义
- [ ] 创建 React Query Hooks
- [ ] 实现 WebSocket 实时同步
- [ ] 从 EcoPaste 复制通用组件

### 优先级 P1（重要）
- [ ] 用户认证（登录/注册）
- [ ] 剪贴板历史列表
- [ ] 搜索功能
- [ ] 分组管理
- [ ] 设置页面

### 优先级 P2（优化）
- [ ] 响应式布局优化
- [ ] 加载状态优化
- [ ] 错误处理
- [ ] 性能优化
- [ ] 单元测试

## 📖 相关文档

- [INSTALL.md](./INSTALL.md) - 安装指南
- [README_SETUP.md](./README_SETUP.md) - 详细配置说明
- [NEXT_STEPS.md](./NEXT_STEPS.md) - 下一步开发指南

## 🤝 开发规范

### 代码风格
- 使用 TypeScript
- 使用函数式组件
- 使用 Hooks
- 遵循 ESLint 规则

### 文件命名
- 组件：PascalCase（例：`ProList.tsx`）
- 工具：camelCase（例：`color.ts`）
- 样式：kebab-case（例：`global.scss`）

### 导入顺序
1. React 相关
2. 第三方库
3. 项目内部模块（使用 `@/` 别名）
4. 样式文件

## 🎉 总结

项目基础架构已**全部搭建完成**！

**核心配置：**
- ✅ Vite + React + TypeScript
- ✅ Ant Design + UnoCSS（UI 与 EcoPaste 100% 一致）
- ✅ API 客户端 + WebSocket
- ✅ 状态管理 + 路由
- ✅ 所有配置文件

**立即开始：**
```bash
cd /Users/tianjy/projects/EcoPaste/cloud_paste_web
pnpm install
pnpm dev
```

**下一步：** 查看 [NEXT_STEPS.md](./NEXT_STEPS.md) 开始实现业务逻辑！

---

**有问题随时问我！Good luck! 🚀**
