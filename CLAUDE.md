# CLAUDE.md

这个文件为 Claude Code (claude.ai/code) 在这个代码库中工作提供指导。

每次请用中文回答我。

## 项目概述

EcoPaste 是一个基于 Tauri 2 + React 18 + Vite 5 的跨平台剪贴板管理工具，支持 Windows、macOS 和 Linux(x11)。项目使用本地 SQLite 数据库存储剪贴板历史记录，提供丰富的剪贴板内容类型支持（文本、富文本、HTML、图片、文件）。

## 技术栈

- **前端**: React 18.3.1 + TypeScript + Vite 5.4.20
- **桌面框架**: Tauri 2
- **UI 框架**: Ant Design 5 + UnoCSS
- **状态管理**: Valtio
- **数据库**: Kysely + tauri-plugin-sql (SQLite)
- **国际化**: i18next + react-i18next
- **代码质量**: Biome (linting & formatting)
- **包管理器**: pnpm (强制使用，通过 preinstall 钩子检查)

## 开发命令

### 前端开发
```bash
# 启动 Vite 开发服务器（仅前端，不启动 Tauri）
pnpm dev:vite

# 启动完整开发环境（构建图标 + 启动 Vite）
pnpm dev

# 构建前端（构建图标 + 构建 Vite）
pnpm build

# 构建图标
pnpm build:icon
```

### Tauri 开发
```bash
# 启动 Tauri 开发模式（会自动运行 pnpm dev 作为 beforeDevCommand）
pnpm tauri dev

# 构建 Tauri 应用（会自动运行 pnpm build 作为 beforeBuildCommand）
pnpm tauri build

# 其他 Tauri 命令
pnpm tauri [command]
```

### 代码质量
```bash
# 使用 Biome 检查并自动修复代码问题
pnpm lint

# Git hooks 会在提交时自动运行 lint-staged
# commit-msg: commitlint 检查提交信息格式
# pre-commit: biome check --write
```

### 发布版本
```bash
# 正式版本
pnpm release

# RC 版本
pnpm release-rc

# Beta 版本
pnpm release-beta
```

### Rust 后端开发
```bash
# 在 src-tauri 目录下
cd src-tauri

# 检查 Rust 代码
cargo check

# 运行 Rust 测试
cargo test

# 格式化 Rust 代码
cargo fmt

# 运行 Clippy 检查
cargo clippy
```

## 项目架构

### 目录结构

```
.
├── src/                          # React 前端代码
│   ├── components/               # 可复用组件
│   ├── pages/                    # 页面组件
│   │   ├── Main/                # 主窗口（剪贴板历史列表）
│   │   └── Preference/          # 偏好设置窗口
│   ├── stores/                   # Valtio 状态管理
│   │   ├── global.ts            # 全局状态（设置、快捷键等）
│   │   └── clipboard.ts         # 剪贴板状态
│   ├── database/                 # Kysely 数据库操作
│   ├── hooks/                    # 自定义 React Hooks
│   ├── locales/                  # 国际化翻译文件
│   ├── plugins/                  # Tauri 插件前端 API 封装
│   ├── utils/                    # 工具函数
│   ├── router.tsx               # React Router 配置
│   ├── App.tsx                  # 根组件
│   └── main.tsx                 # 应用入口
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── core/                # 核心功能
│   │   │   ├── setup/           # 平台特定初始化逻辑
│   │   │   │   ├── macos.rs    # macOS 特定配置
│   │   │   │   ├── windows.rs  # Windows 特定配置
│   │   │   │   └── linux.rs    # Linux 特定配置
│   │   │   └── prevent_default.rs
│   │   ├── plugins/             # 自定义 Tauri 插件
│   │   │   ├── window/         # 窗口管理插件
│   │   │   ├── paste/          # 粘贴功能插件
│   │   │   └── autostart/      # 自启动检测插件
│   │   ├── lib.rs              # 主库文件，插件注册和应用启动
│   │   └── main.rs             # 入口文件
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置
├── scripts/                      # 构建脚本
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
├── biome.json                   # Biome 配置
└── package.json                 # Node.js 依赖配置
```

### 多窗口架构

项目使用两个主窗口：

1. **主窗口 (main)**: 剪贴板历史列表窗口
   - 路由: `/#/`
   - Label: `main`
   - 特性: 始终置顶、无装饰、透明背景、不显示在任务栏

2. **偏好设置窗口 (preference)**: 应用设置窗口
   - 路由: `/#/preference`
   - Label: `preference`
   - 特性: 居中显示、毛玻璃效果（macOS）

窗口管理通过自定义的 `tauri-plugin-eco-window` 插件实现。

### 前后端通信

- 前端使用 `@tauri-apps/api/core` 的 `invoke` 函数调用 Rust 命令
- Rust 端使用 `#[tauri::command]` 宏定义可调用的命令
- 自定义插件使用 `generate_handler!` 宏注册命令

示例：
```javascript
// 前端调用 (src/plugins/window.ts)
import { invoke } from "@tauri-apps/api/core";
await invoke("plugin:eco-window|show_window");
```

```rust
// Rust 端定义 (src-tauri/src/plugins/window/src/commands/mod.rs)
#[tauri::command]
pub fn show_window(app: AppHandle) {
    // 实现逻辑
}
```

### 自定义 Tauri 插件

项目包含三个自定义插件（位于 `src-tauri/src/plugins/`）：

1. **tauri-plugin-eco-window**: 窗口管理
   - 命令: `show_window`, `hide_window`, `show_taskbar_icon`
   - 平台特定实现: macOS 使用 `tauri-nspanel` 实现特殊窗口行为

2. **tauri-plugin-eco-paste**: 粘贴功能
   - 命令: `paste`
   - 平台特定实现: macOS/Windows/Linux 各有不同的粘贴逻辑

3. **tauri-plugin-eco-autostart**: 自启动状态检测
   - 命令: 检测应用是否设置了自启动

### 数据库架构

使用 Kysely 作为类型安全的 SQL 查询构建器，基于 `tauri-plugin-sql` 的 SQLite 数据库。

- 数据库文件路径由 `getSaveDatabasePath()` 动态获取
- 主表: `history` 表存储剪贴板历史记录
- 字段包括: id, type, group, value, search, count, width, height, favorite, createTime, note, subtype

数据库初始化在 `src/database/index.ts` 中的 `getDatabase()` 函数。

### 状态管理

使用 Valtio 进行状态管理：

- **globalStore** (`src/stores/global.ts`): 应用设置、外观、快捷键、更新配置
- **clipboardStore** (`src/stores/clipboard.ts`): 剪贴板相关状态

状态持久化通过 `restoreStore()` 工具函数实现。

### 平台特定逻辑

项目在多个层面处理平台差异：

1. **Rust 层**: `src-tauri/src/core/setup/` 下的平台特定初始化
2. **插件层**: 自定义插件的 commands 目录包含平台特定实现
3. **前端层**: 通过 Tauri 的 OS 插件检测平台并调整 UI/行为

### 路径别名

- TypeScript: `@/*` → `src/*` (配置在 tsconfig.json)
- Vite: `@` → `/src` (配置在 vite.config.ts)

### 开发服务器配置

- 端口: 1420 (strictPort: true)
- HMR 端口: 1421 (WebSocket)
- 构建输出: `dist/`

## 添加新的 Tauri 命令

### 在现有插件中添加命令

1. 在插件的 `commands/` 目录下定义命令函数并加上 `#[tauri::command]`
2. 在插件的 `lib.rs` 中的 `invoke_handler` 中注册新命令
3. 在前端使用 `invoke("plugin:plugin-name|command_name", { args })` 调用

### 创建新的自定义插件

1. 在 `src-tauri/src/plugins/` 创建新目录
2. 创建 `Cargo.toml` 和 `src/lib.rs`
3. 在工作区的 `Cargo.toml` 中添加插件依赖
4. 在 `src-tauri/Cargo.toml` 中引用插件
5. 在 `src-tauri/src/lib.rs` 的 `Builder` 中添加 `.plugin(your_plugin::init())`

## 关键依赖说明

### Tauri 插件
- `tauri-plugin-sql`: SQLite 数据库
- `tauri-plugin-clipboard-x`: 剪贴板监听和操作
- `tauri-plugin-global-shortcut`: 全局快捷键
- `tauri-plugin-updater`: 应用自动更新
- `tauri-plugin-single-instance`: 单实例运行
- `tauri-plugin-fs-pro`: 扩展文件系统操作
- `tauri-plugin-macos-permissions`: macOS 系统权限请求
- `tauri-nspanel` (仅 macOS): 特殊窗口行为

### 前端库
- `valtio`: 轻量级状态管理
- `kysely`: 类型安全的 SQL 查询构建器
- `ahooks`: React Hooks 库
- `react-virtuoso`: 虚拟滚动列表
- `react-markdown`: Markdown 渲染
- `rtf.js`: RTF 文件解析
- `UnoCSS`: 原子化 CSS 引擎

## 代码规范

项目使用 Biome 进行代码检查和格式化：

- 启用自动导入排序和未使用导入清理
- 禁用 `console` 使用（必须使用 `@tauri-apps/plugin-log`）
- 强制使用自闭合元素
- TypeScript strict 模式

提交规范遵循 Conventional Commits (通过 commitlint 检查)。

## 国际化

- 使用 `i18next` 和 `react-i18next`
- 翻译文件位于 `src/locales/`
- 支持语言: 简体中文、繁体中文、英文、日文
- Ant Design 的 locale 配置在 `getAntdLocale()` 函数中
