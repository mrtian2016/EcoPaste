# 快速安装指南

## 一键安装所有依赖

在项目根目录执行：

```bash
pnpm install
```

如果遇到依赖冲突，可以使用：

```bash
pnpm install --force
```

或者使用 npm：

```bash
npm install --legacy-peer-deps
```

## 依赖列表

所有依赖已配置在 `package.json` 中，包括：

### 生产依赖
- React 生态: react, react-dom, react-router-dom
- UI 框架: antd, @ant-design/happy-work-theme, @ant-design/icons
- 状态管理: valtio, @tanstack/react-query
- 网络请求: axios, socket.io-client
- 样式: unocss, @unocss/reset, mac-scrollbar, sass
- 工具: ahooks, dayjs, es-toolkit, nanoid, i18next
- 其他: dompurify, react-markdown, react-virtuoso

### 开发依赖
- TypeScript 及类型定义
- Vite 及插件
- UnoCSS
- ESLint 相关

## 启动项目

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 预览构建
pnpm preview
```

## 端口配置

- 开发服务器: `http://localhost:3001`
- API 代理: `/api` -> `http://localhost:3000/api`

## 验证安装

安装完成后，运行 `pnpm dev`，如果浏览器能正常打开并看到 "Cloud Paste Web" 页面，说明安装成功！

## 可能的问题

### 1. pnpm 未安装

```bash
npm install -g pnpm
```

### 2. Node 版本过低

建议使用 Node.js >= 18

### 3. 依赖冲突

清理并重新安装：

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```
