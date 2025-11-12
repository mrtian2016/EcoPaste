import { proxy } from "valtio";

interface GlobalStore {
  appearance: {
    language: string;
    isDark: boolean;
    themeColor: string;
  };
}

export const globalStore = proxy<GlobalStore>({
  appearance: {
    isDark: false,
    language: "zh-CN",
    themeColor: "#1890ff",
  },
});
