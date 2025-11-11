# PWA 图标资源指南

## 所需图标列表

为了确保 PWA 在所有平台上都能正常显示，需要准备以下图标文件并放置在 `public/` 目录下：

### 必需图标

1. **pwa-64x64.png** (64x64 像素)
   - 用于小尺寸设备和通知图标

2. **pwa-192x192.png** (192x192 像素)
   - Android Chrome 浏览器的标准图标

3. **pwa-512x512.png** (512x512 像素)
   - Android Chrome 浏览器的高分辨率图标
   - PWA 安装时的应用图标

4. **maskable-icon-512x512.png** (512x512 像素)
   - Android 自适应图标（带 safe zone）
   - 用于支持 maskable icons 的平台

### iOS 专用图标

5. **apple-touch-icon.png** (180x180 像素)
   - iOS Safari 浏览器添加到主屏幕时使用

6. **mask-icon.svg**
   - Safari 标签页固定图标（单色 SVG）

### 可选图标

7. **favicon.ico** (多尺寸 ICO 文件)
   - 传统浏览器标签页图标

## 快速生成图标

### 方法 1: 使用在线工具（推荐）

访问以下任一工具，上传你的原始 logo（建议至少 512x512 像素）：

- **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
  - 上传图片后自动生成所有需要的尺寸

- **RealFaviconGenerator**: https://realfavicongenerator.net/
  - 支持更详细的图标定制

- **Favicon.io**: https://favicon.io/
  - 简单快速生成多种图标

### 方法 2: 使用 PWA Asset Generator CLI

```bash
# 安装工具
npm install -g pwa-asset-generator

# 生成所有图标（在项目根目录执行）
pwa-asset-generator [原始图片路径] ./public --icon-only
```

### 方法 3: 使用 ImageMagick 手动生成

如果已安装 ImageMagick，可以使用以下命令：

```bash
# 进入 public 目录
cd public

# 假设原始图片为 logo.png
convert logo.png -resize 64x64 pwa-64x64.png
convert logo.png -resize 192x192 pwa-192x192.png
convert logo.png -resize 512x512 pwa-512x512.png
convert logo.png -resize 180x180 apple-touch-icon.png
```

## Maskable Icon 注意事项

Maskable icon 需要在中心内容周围留有安全区域（safe zone）：

- 图标总尺寸：512x512 像素
- 安全区域：中心 312x312 像素内的内容保证可见
- 可见区域：中心 384x384 像素内的内容在大多数情况下可见
- 建议：将主要内容放在中心 280x280 像素区域内

### 在线生成 Maskable Icon

访问：https://maskable.app/editor
- 上传你的图标
- 调整位置和大小，确保在不同形状遮罩下都能正常显示
- 下载生成的 maskable icon

## 图标设计建议

1. **保持简洁**：图标应该在小尺寸下也能清晰辨识
2. **使用纯色背景**：避免透明背景，使用与品牌相关的纯色
3. **居中对齐**：确保主要元素在图标中心
4. **测试多种尺寸**：在不同设备和尺寸下预览效果
5. **遵循平台规范**：
   - iOS: 使用圆角矩形设计
   - Android: 使用圆形或方形设计

## 快速测试

完成图标添加后，可以通过以下方式测试：

1. **开发环境测试**：
   ```bash
   pnpm dev
   ```
   打开浏览器开发者工具 → Application → Manifest，查看图标是否正确加载

2. **Chrome PWA 审计**：
   - 打开 Chrome DevTools
   - 切换到 Lighthouse 标签
   - 选择 "Progressive Web App" 类别
   - 运行审计，查看图标相关项是否通过

3. **实际设备测试**：
   - 在 Chrome（Android）或 Safari（iOS）中打开应用
   - 点击 "添加到主屏幕"
   - 检查安装后的图标显示效果

## 当前配置

图标已在以下文件中配置：
- `vite.config.ts`: PWA manifest 配置
- `index.html`: meta 标签和 link 标签

配置完成后，执行 `pnpm build` 构建生产版本，PWA 功能将自动启用。
