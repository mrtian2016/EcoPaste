# 剪贴板历史列表功能说明

## ✅ 已完成的功能

### 1. 完整的类型定义
- ✅ `src/types/clipboard.ts` - 完整的 TypeScript 类型定义
- ✅ 与后端 API 完全一致的数据结构
- ✅ 支持文本、图片、文件等多种类型

### 2. API 集成
- ✅ `src/api/endpoints/clipboard.ts` - 完整的 API 端点定义
- ✅ 支持 CRUD 操作（增删改查）
- ✅ 支持批量操作
- ✅ 支持收藏、备注等功能

### 3. React Query Hooks
- ✅ `src/hooks/useClipboardHistory.ts` - 数据管理 Hooks
- ✅ 自动缓存和状态管理
- ✅ 乐观更新和错误处理
- ✅ 自动刷新数据

### 4. UI 组件
- ✅ `src/components/ClipboardItem/index.tsx` - 列表项组件
  - 显示不同类型的剪贴板内容（文本、图片、文件等）
  - 支持复制到剪贴板
  - 支持收藏/取消收藏
  - 支持删除操作
  - 显示设备信息和时间戳

- ✅ `src/pages/ClipboardHistory/index.tsx` - 历史列表页面
  - 分页显示
  - 搜索功能（防抖优化）
  - 收藏筛选
  - 批量选择和删除
  - 响应式布局

### 5. 路由配置
- ✅ `/` - 首页（演示页面）
- ✅ `/clipboard` - 剪贴板历史列表

## 📦 功能特性

### 列表功能
- ✅ 分页加载（支持自定义每页数量）
- ✅ 搜索功能（实时搜索，防抖优化）
- ✅ 收藏筛选（全部/已收藏/未收藏）
- ✅ 批量选择和删除
- ✅ 全选/取消全选
- ✅ 刷新按钮

### 列表项功能
- ✅ 显示内容（文本/图片/文件）
- ✅ 显示时间戳
- ✅ 显示设备信息
- ✅ 显示类型标签
- ✅ 收藏/取消收藏
- ✅ 复制到剪贴板（文本类型）
- ✅ 删除（带确认）
- ✅ 图片预览

### 数据类型支持
- ✅ 文本（text）
- ✅ HTML
- ✅ RTF
- ✅ 代码（subtype: code）
- ✅ 链接（subtype: link）
- ✅ 图片（image）
- ✅ 文件列表（files）

## 🚀 如何使用

### 1. 启动项目

```bash
cd /Users/tianjy/projects/EcoPaste/cloud_paste_web
pnpm install
pnpm dev
```

### 2. 访问页面

- 首页：`http://localhost:3001/`
- 剪贴板历史：`http://localhost:3001/clipboard`

### 3. 配置后端 API

确保后端服务运行在 `http://localhost:3000`，或修改 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 4. 认证要求

⚠️ **重要**：剪贴板 API 需要用户认证。你需要先实现登录功能或在 Axios 拦截器中添加 token。

临时解决方案（开发环境）：

```typescript
// src/api/client.ts
apiClient.interceptors.request.use((config) => {
  // 临时 token（用于测试）
  config.headers.Authorization = "Bearer YOUR_TEST_TOKEN";
  return config;
});
```

## 📊 后端 API 对应关系

| 前端方法 | 后端接口 | 说明 |
|---------|---------|------|
| `clipboardApi.getList()` | `GET /api/v1/clipboard/` | 获取列表 |
| `clipboardApi.getItem(id)` | `GET /api/v1/clipboard/{id}` | 获取单项 |
| `clipboardApi.createItem(data)` | `POST /api/v1/clipboard/` | 添加 |
| `clipboardApi.updateItem(id, updates)` | `PUT /api/v1/clipboard/{id}` | 更新 |
| `clipboardApi.deleteItem(id)` | `DELETE /api/v1/clipboard/{id}` | 删除 |
| `clipboardApi.batchDelete(ids)` | `DELETE /api/v1/clipboard/` | 批量删除 |

## 🎨 UI 样式

使用与 EcoPaste 完全一致的设计：
- Ant Design 组件库
- UnoCSS 原子化 CSS
- 明暗主题切换
- 响应式布局

### 主要样式类

```typescript
// 背景色
bg-color-1, bg-color-2, bg-color-3, bg-color-4

// 文字色
text-color-1, text-color-2, text-color-3

// 边框色
border-color-1, border-color-2

// 主题色
text-primary, text-danger, text-success, text-gold
```

## 🔧 扩展功能

### 添加 WebSocket 实时同步

```typescript
// src/hooks/useClipboardRealtime.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "@/api/websocket";
import { CLIPBOARD_QUERY_KEY } from "./useClipboardHistory";

export const useClipboardRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    wsClient.connect(import.meta.env.VITE_WS_URL || "ws://localhost:3000");

    // 监听新的剪贴板项
    wsClient.on("clipboard:new", (item) => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
    });

    // 监听删除事件
    wsClient.on("clipboard:deleted", (id) => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
    });

    return () => {
      wsClient.disconnect();
    };
  }, [queryClient]);
};
```

在 `App.tsx` 中启用：

```typescript
import { useClipboardRealtime } from "@/hooks/useClipboardRealtime";

const App = () => {
  useClipboardRealtime(); // 启用实时同步
  // ...
};
```

### 添加备注编辑功能

```typescript
// 在 ClipboardItem 组件中添加
import { Modal, Input } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { useUpdateNote } from "@/hooks/useClipboardHistory";

const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
const [noteValue, setNoteValue] = useState(item.note || "");
const updateNoteMutation = useUpdateNote();

const handleUpdateNote = () => {
  updateNoteMutation.mutate(
    { id: item.id, note: noteValue },
    {
      onSuccess: () => {
        setIsNoteModalOpen(false);
      },
    }
  );
};
```

## 🐛 常见问题

### 1. 图片无法显示

确保：
- 后端文件服务正常运行
- `VITE_API_BASE_URL` 配置正确
- 图片路径拼接正确

### 2. API 请求失败

检查：
- 后端服务是否运行
- Token 是否有效
- CORS 配置是否正确

### 3. 搜索不生效

确保：
- 防抖功能正常（使用 `ahooks` 的 `useDebounce`）
- 后端搜索字段正确

## 📝 下一步

建议实现的功能：
- [ ] 用户认证和登录
- [ ] WebSocket 实时同步
- [ ] 备注编辑功能
- [ ] 图片放大预览
- [ ] 文件下载功能
- [ ] 拖拽排序
- [ ] 导出功能
- [ ] 设置页面

## 🎉 总结

剪贴板历史列表功能已经完整实现！

**已完成：**
- ✅ 完整的类型定义
- ✅ API 集成
- ✅ React Query Hooks
- ✅ 列表页面和列表项组件
- ✅ 搜索、筛选、分页
- ✅ 批量操作
- ✅ 收藏功能

**现在可以：**
1. 启动项目：`pnpm dev`
2. 访问：`http://localhost:3001/clipboard`
3. 连接后端 API 查看真实数据

**注意：** 需要先实现用户认证，或在开发环境中临时添加 token。

祝开发愉快！🚀
