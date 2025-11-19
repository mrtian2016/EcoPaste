import {
  defineConfig,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";

export default defineConfig({
  presets: [presetUno(), presetIcons()],
  rules: [["outline-none", { outline: "none" }]],
  // 保护动态类名，确保生产构建时不被移除
  // 这些图标类名通过 UnoIcon 组件的 name 属性动态传递，需要显式声明
  safelist: [
    // hugeicons 图标集
    "i-hugeicons:copy-01",
    "i-hugeicons:database-export",
    "i-hugeicons:database-import",
    "i-hugeicons:delete-02",
    "i-hugeicons:download-02",
    "i-hugeicons:file-01",
    "i-hugeicons:image-02",
    "i-hugeicons:logout-03",
    "i-hugeicons:music-note-03",
    "i-hugeicons:task-edit-01",
    "i-hugeicons:video-01",
    "i-hugeicons:view",
    // iconamoon 图标集
    "i-iconamoon:close-circle-1",
    "i-iconamoon:star",
    "i-iconamoon:star-fill",
    "i-iconamoon:volume-up-light",
  ],
  shortcuts: [
    [/^bg-color-(\d+)$/, ([, d]) => `bg-bg-${d}`],
    [/^text-color-(\d+)$/, ([, d]) => `text-text-${d}`],
    [/^b-color-(\d+)$/, ([, d]) => `b-border-${d}`],
    [/^(.*)-primary-(\d+)$/, ([, s, d]) => `${s}-[var(--ant-blue-${d})]`],
  ],
  theme: {
    colors: {
      "bg-1": "var(--ant-color-bg-container)",
      "bg-2": "var(--ant-color-bg-layout)",
      "bg-3": "var(--ant-color-fill-quaternary)",
      "bg-4": "var(--ant-color-fill-content)",
      "border-1": "var(--ant-color-border)",
      "border-2": "var(--ant-color-border-secondary)",
      danger: "var(--ant-red)",
      gold: "var(--ant-gold)",
      primary: "var(--ant-blue)",
      success: "var(--ant-green)",
      "text-1": "var(--ant-color-text)",
      "text-2": "var(--ant-color-text-secondary)",
      "text-3": "var(--ant-color-text-tertiary)",
    },
  },
  transformers: [
    transformerVariantGroup(),
    transformerDirectives({
      applyVariable: ["--uno"],
    }),
  ],
});
