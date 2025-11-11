# PWA 测试指南

## ✅ 已完成的配置

### 1. 图标资源
- ✅ Android 图标：6 个尺寸（48-512px）
- ✅ iOS 图标：26 个尺寸（16-1024px）
- ✅ Windows 11 图标：80+ 个不同尺寸和样式
- ✅ 所有图标已正确集成到构建输出

### 2. PWA Manifest
```json
{
  "name": "EcoPaste - 云剪贴板",
  "short_name": "EcoPaste",
  "description": "跨设备云剪贴板管理工具，支持文本、图片、文件等多种内容类型的同步",
  "theme_color": "#1890ff",
  "background_color": "#ffffff",
  "display": "standalone",
  "icons": [8 个不同尺寸的图标]
}
```

### 3. Service Worker
- ✅ 自动更新模式
- ✅ 离线缓存（字体、API、图片）
- ✅ 126 个文件预缓存（包括所有图标）
- ✅ 更新提示组件

---

## 🧪 测试步骤

### 方法 1：开发环境测试

```bash
# 启动开发服务器（PWA 已在开发环境启用）
pnpm dev
```

1. 打开浏览器：http://localhost:3001
2. 打开开发者工具（F12）
3. 切换到 **Application** 标签
4. 查看左侧菜单：
   - **Manifest**：检查图标和配置
   - **Service Workers**：确认 SW 已激活
   - **Storage > Cache Storage**：查看缓存内容

### 方法 2：生产环境测试

```bash
# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

访问预览地址（通常是 http://localhost:4173），重复方法 1 的步骤。

### 方法 3：Lighthouse PWA 审计

1. 打开 Chrome 浏览器
2. 访问应用（开发或生产环境）
3. 打开开发者工具（F12）
4. 切换到 **Lighthouse** 标签
5. 勾选 "Progressive Web App"
6. 点击 "Analyze page load"
7. 查看 PWA 得分和具体项目

**预期通过的项目：**
- ✅ 提供有效的 web app manifest
- ✅ 具有可安装的图标
- ✅ 注册了 Service Worker
- ✅ 响应式设计
- ✅ HTTPS（生产环境）
- ✅ 离线时可访问

---

## 📱 实际设备测试

### Android 设备（Chrome）

1. 在 Chrome 中打开应用
2. 点击右上角菜单（⋮）
3. 选择 "**添加到主屏幕**" 或 "**安装应用**"
4. 点击 "添加"
5. 检查主屏幕上的应用图标
6. 点击图标启动应用（应该以独立窗口打开，无浏览器地址栏）

**验证点：**
- ✅ 图标显示清晰（使用 android-launchericon-*）
- ✅ 应用名称显示为 "EcoPaste"
- ✅ 启动画面使用蓝色主题（#1890ff）
- ✅ 独立窗口模式（无地址栏）

### iOS 设备（Safari）

1. 在 Safari 中打开应用
2. 点击底部分享按钮（⬆️）
3. 向下滚动，选择 "**添加到主屏幕**"
4. 编辑名称（可选），点击 "添加"
5. 检查主屏幕上的应用图标
6. 点击图标启动应用

**验证点：**
- ✅ 图标显示清晰（使用 ios/180.png）
- ✅ 应用名称显示为 "EcoPaste"
- ✅ 独立窗口模式（无 Safari 工具栏）
- ✅ 状态栏样式正常

### Windows 11（Edge/Chrome）

1. 在 Edge 或 Chrome 中打开应用
2. 地址栏右侧会出现安装图标（+）
3. 点击安装图标
4. 点击 "安装"
5. 应用会在新窗口中打开，并出现在开始菜单和任务栏

**验证点：**
- ✅ 图标在任务栏和开始菜单正确显示
- ✅ 独立窗口模式
- ✅ 可以固定到任务栏

---

## 🔍 PWA 功能测试清单

### 基础功能
- [ ] 应用可以安装到设备主屏幕
- [ ] 图标在所有位置显示清晰
- [ ] 应用名称正确显示
- [ ] 启动画面使用正确的主题色
- [ ] 独立窗口模式（无浏览器 UI）

### 离线功能
- [ ] 断开网络后，应用仍可访问
- [ ] 静态资源（CSS、JS）可离线加载
- [ ] 已访问的页面可离线查看
- [ ] 网络恢复后，数据自动同步

### 更新功能
- [ ] 部署新版本后，用户收到更新提示
- [ ] 点击提示后，应用刷新到新版本
- [ ] Service Worker 自动更新

### 性能
- [ ] 首次加载速度快
- [ ] 再次访问速度更快（使用缓存）
- [ ] 图片加载流畅

---

## 🐛 常见问题排查

### 问题 1：图标不显示
**解决方案：**
```bash
# 清除构建缓存
rm -rf dist node_modules/.vite

# 重新构建
pnpm build
```

### 问题 2：Service Worker 未注册
**解决方案：**
1. 检查控制台是否有错误
2. 确保在 HTTPS 或 localhost 上运行
3. 清除浏览器缓存和 Service Worker
4. 重新加载页面

### 问题 3：更新提示不显示
**解决方案：**
1. 确保已经安装了旧版本
2. 部署新版本后等待 1 小时（自动检查间隔）
3. 或手动在 Application > Service Workers 中点击 "Update"

### 问题 4：iOS 不显示添加到主屏幕
**解决方案：**
1. 确保使用 Safari 浏览器（不是 Chrome）
2. 检查 index.html 中的 apple-mobile-web-app-* meta 标签
3. 确保 manifest 配置正确

---

## 📊 预期测试结果

### Lighthouse PWA 分数
- **目标分数：** 90+ / 100
- **关键指标：**
  - Fast and reliable: ✅
  - Installable: ✅
  - PWA Optimized: ✅

### 构建输出
```
✓ dist/manifest.webmanifest (1.00 kB)
✓ precache 126 entries (2226.02 KiB)
✓ dist/sw.js
✓ dist/workbox-8a682eb8.js
```

---

## 🚀 部署注意事项

### HTTPS 要求
生产环境的 PWA **必须**通过 HTTPS 提供服务（localhost 除外）。

### 更新策略
- Service Worker 使用 `autoUpdate` 模式
- 每小时自动检查更新
- 用户点击更新提示后立即刷新

### 缓存策略
- **字体：** CacheFirst，缓存 1 年
- **API：** NetworkFirst，缓存 5 分钟
- **图片：** CacheFirst，缓存 30 天
- **静态资源：** 预缓存，永久缓存

---

## 📝 下一步优化建议

1. **添加离线页面**：当用户完全离线且访问未缓存页面时显示
2. **推送通知**：使用 Web Push API 发送通知
3. **后台同步**：使用 Background Sync API 在网络恢复时同步数据
4. **分享功能**：实现 Web Share API
5. **性能监控**：集成 Analytics 跟踪 PWA 安装和使用率

---

## 🎉 完成！

你的 PWA 已经完全配置好了！现在可以：
1. 在开发环境测试：`pnpm dev`
2. 构建生产版本：`pnpm build`
3. 部署到生产环境
4. 在实际设备上安装测试

如有任何问题，请查看：
- Chrome DevTools > Application > Manifest
- Chrome DevTools > Console（查看错误）
- Lighthouse PWA 审计报告
