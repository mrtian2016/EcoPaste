# 下一步开发指南

项目基础架构已搭建完成！以下是后续开发步骤：

## ✅ 已完成

- [x] 项目初始化（Vite + React + TypeScript）
- [x] UnoCSS 配置（与 EcoPaste 完全一致）
- [x] Ant Design + 主题配置
- [x] 路由配置（React Router）
- [x] API 客户端（Axios）
- [x] WebSocket 封装（Socket.IO）
- [x] 状态管理（Valtio）
- [x] 全局样式（SCSS）
- [x] TypeScript 路径别名（@/ -> src/）
- [x] 示例组件（ProList）

## 🚀 下一步任务

### 1. 安装依赖并启动项目

```bash
cd /Users/tianjy/projects/EcoPaste/cloud_paste_web
pnpm install
pnpm dev
```

### 2. 从 EcoPaste 复制组件

推荐复制以下组件（已经是纯 UI 组件，无需修改）：

```bash
# 在 EcoPaste 项目根目录执行

# 复制通用组件
cp -r src/components/ProSelect cloud_paste_web/src/components/
cp -r src/components/ProSwitch cloud_paste_web/src/components/
cp -r src/components/UnoIcon cloud_paste_web/src/components/
cp -r src/components/Scrollbar cloud_paste_web/src/components/

# 复制工具函数
cp -r src/utils/dayjs.ts cloud_paste_web/src/utils/
cp -r src/utils/color.ts cloud_paste_web/src/utils/
cp -r src/utils/dom.ts cloud_paste_web/src/utils/
```

### 3. 创建页面组件

参考 EcoPaste 的页面结构，创建 Web 版本：

```typescript
// src/pages/Home/index.tsx
import { Button } from "antd";

const Home = () => {
  return (
    <div className="p-4">
      <h1>首页</h1>
    </div>
  );
};

export default Home;
```

更新路由：

```typescript
// src/App.tsx
import Home from "@/pages/Home";

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/settings" element={<Settings />} />
</Routes>
```

### 4. 实现 API 端点

```typescript
// src/api/endpoints/clipboard.ts
import { apiClient } from "../client";

export interface ClipboardItem {
  id: string;
  content: string;
  type: string;
  createdAt: string;
}

export const clipboardApi = {
  // 获取历史记录
  getHistory: (params: { page: number; limit: number }) =>
    apiClient.get<ClipboardItem[]>("/clipboard/history", { params }),

  // 添加记录
  addItem: (data: Omit<ClipboardItem, "id" | "createdAt">) =>
    apiClient.post<ClipboardItem>("/clipboard/items", data),

  // 删除记录
  deleteItem: (id: string) =>
    apiClient.delete(`/clipboard/items/${id}`),

  // 搜索
  search: (keyword: string) =>
    apiClient.get<ClipboardItem[]>("/clipboard/search", { params: { keyword } }),
};
```

### 5. 使用 React Query

```typescript
// src/hooks/useClipboardHistory.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clipboardApi } from "@/api/endpoints/clipboard";

export const useClipboardHistory = () => {
  const queryClient = useQueryClient();

  // 查询历史
  const { data, isLoading, error } = useQuery({
    queryKey: ["clipboard-history"],
    queryFn: () => clipboardApi.getHistory({ page: 1, limit: 50 }),
  });

  // 删除记录
  const deleteMutation = useMutation({
    mutationFn: clipboardApi.deleteItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clipboard-history"] });
    },
  });

  return {
    historyList: data || [],
    isLoading,
    error,
    deleteItem: deleteMutation.mutate,
  };
};
```

在组件中使用：

```typescript
import { useClipboardHistory } from "@/hooks/useClipboardHistory";

const ClipboardList = () => {
  const { historyList, isLoading, deleteItem } = useClipboardHistory();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {historyList.map((item) => (
        <div key={item.id}>
          {item.content}
          <button onClick={() => deleteItem(item.id)}>删除</button>
        </div>
      ))}
    </div>
  );
};
```

### 6. 集成 WebSocket 实时同步

```typescript
// src/hooks/useRealtimeSync.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "@/api/websocket";

export const useRealtimeSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:3000";
    wsClient.connect(wsUrl);

    // 监听新记录
    wsClient.on("clipboard:new", (item) => {
      queryClient.setQueryData(["clipboard-history"], (old: any) => [
        item,
        ...(old || []),
      ]);
    });

    // 监听删除
    wsClient.on("clipboard:deleted", (id) => {
      queryClient.setQueryData(["clipboard-history"], (old: any) =>
        (old || []).filter((item: any) => item.id !== id)
      );
    });

    return () => {
      wsClient.disconnect();
    };
  }, [queryClient]);
};
```

在 App.tsx 中启用：

```typescript
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

const App = () => {
  useRealtimeSync(); // 启用实时同步

  // ...
};
```

### 7. 状态管理

```typescript
// src/stores/clipboard.ts
import { proxy } from "valtio";

interface ClipboardStore {
  selectedId: string | null;
  searchKeyword: string;
  filter: {
    type: "all" | "text" | "image" | "file";
  };
}

export const clipboardStore = proxy<ClipboardStore>({
  selectedId: null,
  searchKeyword: "",
  filter: {
    type: "all",
  },
});
```

在组件中使用：

```typescript
import { useSnapshot } from "valtio";
import { clipboardStore } from "@/stores/clipboard";

const SearchBar = () => {
  const { searchKeyword } = useSnapshot(clipboardStore);

  return (
    <input
      value={searchKeyword}
      onChange={(e) => {
        clipboardStore.searchKeyword = e.target.value;
      }}
    />
  );
};
```

### 8. 国际化

```typescript
// src/locales/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": {
      translation: {
        welcome: "欢迎",
        clipboard: "剪贴板",
      },
    },
    "en-US": {
      translation: {
        welcome: "Welcome",
        clipboard: "Clipboard",
      },
    },
  },
  lng: "zh-CN",
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

使用：

```typescript
import { useTranslation } from "react-i18next";

const Header = () => {
  const { t } = useTranslation();
  return <h1>{t("welcome")}</h1>;
};
```

## 📝 推荐的开发顺序

1. ✅ **环境搭建**（已完成）
2. **安装依赖** - `pnpm install`
3. **验证启动** - `pnpm dev` 确保能正常运行
4. **复制组件** - 从 EcoPaste 复制通用组件
5. **创建页面** - 实现主要页面结构
6. **API 集成** - 连接后端接口
7. **WebSocket** - 实现实时同步
8. **优化体验** - 加载状态、错误处理等

## 🎨 UI 组件示例

参考 EcoPaste 的组件风格创建新组件：

```typescript
// src/components/ClipboardCard/index.tsx
import { Card } from "antd";
import { CopyOutlined } from "@ant-design/icons";

interface ClipboardCardProps {
  content: string;
  onCopy: () => void;
}

const ClipboardCard = ({ content, onCopy }: ClipboardCardProps) => {
  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onCopy}
    >
      <div className="flex items-center justify-between">
        <span className="text-color-1 truncate">{content}</span>
        <CopyOutlined className="text-primary" />
      </div>
    </Card>
  );
};

export default ClipboardCard;
```

## 🔍 调试技巧

### 1. 查看 API 请求

在浏览器 DevTools 的 Network 面板查看请求。

### 2. 查看 WebSocket 连接

在 Console 中会有连接日志。

### 3. 查看状态

使用 React DevTools 和 Valtio DevTools。

## 📚 参考资料

- [Ant Design 文档](https://ant.design/)
- [UnoCSS 文档](https://unocss.dev/)
- [React Query 文档](https://tanstack.com/query/latest)
- [Valtio 文档](https://valtio.pmnd.rs/)
- [Socket.IO 文档](https://socket.io/docs/v4/)

---

**开始开发吧！遇到问题随时问我。**
