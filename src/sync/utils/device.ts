/**
 * 设备信息工具
 */
import { hostname, platform } from "@tauri-apps/plugin-os";
import { nanoid } from "nanoid";

const DEVICE_ID_KEY = "eco_device_id";
const DEVICE_NAME_KEY = "eco_device_name";

/**
 * 获取设备 ID（持久化）
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);

  if (!id) {
    id = nanoid(21);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }

  return id;
}

/**
 * 获取设备名称
 */
export async function getDeviceName(): Promise<string> {
  // 优先从缓存获取
  const cached = localStorage.getItem(DEVICE_NAME_KEY);
  if (cached) return cached;

  try {
    const platformName = await platform();
    const hostName = await hostname();

    const deviceName = `${platformName} - ${hostName}`;
    localStorage.setItem(DEVICE_NAME_KEY, deviceName);

    return deviceName;
  } catch (_error) {
    // Fallback
    const fallback = `Device_${navigator.platform}`;
    localStorage.setItem(DEVICE_NAME_KEY, fallback);
    return fallback;
  }
}

/**
 * 设置自定义设备名称
 */
export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name);
}
