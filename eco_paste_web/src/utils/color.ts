import { theme } from "antd";

const { getDesignToken, darkAlgorithm } = theme;

/**
 * 生成 antd 的颜色变量
 */
export const generateColorVars = () => {
  const colors = [
    getDesignToken(),
    getDesignToken({ algorithm: darkAlgorithm }),
  ];

  for (const [index, item] of colors.entries()) {
    const isDark = index !== 0;

    const vars: Record<string, any> = {};

    for (const [key, value] of Object.entries(item)) {
      // 将驼峰命名转换为 kebab-case
      const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      vars[`--ant-${kebabKey}`] = value;
    }

    const style = document.createElement("style");

    style.dataset.theme = isDark ? "dark" : "light";

    const selector = isDark ? "html.dark" : ":root";

    const values = Object.entries(vars).map(
      ([key, value]) => `${key}: ${value};`,
    );

    style.innerHTML = `${selector}{\n${values.join("\n")}\n}`;

    document.head.appendChild(style);
  }
};
