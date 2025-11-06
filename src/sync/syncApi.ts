/**
 * 同步相关 HTTP API
 */
import { getHttpServerUrl, syncConfig } from "./syncStore";

export interface SyncUpdateResponse {
  total: number;
  page: number;
  page_size: number;
  items: any[];
}

/**
 * 获取未同步的数据（基于设备同步时间）
 *
 * @param deviceId 设备ID
 * @param limit 每次获取的数量
 * @param offset 偏移量
 */
export async function fetchSyncUpdates(
  deviceId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<SyncUpdateResponse> {
  const baseUrl = getHttpServerUrl();

  if (!syncConfig.token) {
    throw new Error("未登录");
  }

  const url = new URL(`${baseUrl}/api/v1/clipboard/sync/fetch_updates`);
  url.searchParams.append("device_id", deviceId);
  url.searchParams.append("limit", limit.toString());
  url.searchParams.append("offset", offset.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${syncConfig.token}`,
    },
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "获取同步数据失败");
  }

  const result = await response.json();
  return result;
}

/**
 * 更新设备的最后同步时间
 *
 * @param deviceId 设备ID
 * @param syncTime 同步时间（ISO 8601格式）
 */
export async function updateDeviceSyncTime(
  deviceId: string,
  syncTime: string,
): Promise<void> {
  const baseUrl = getHttpServerUrl();

  if (!syncConfig.token) {
    throw new Error("未登录");
  }

  const response = await fetch(
    `${baseUrl}/api/v1/clipboard/sync/update_sync_time`,
    {
      body: JSON.stringify({
        device_id: deviceId,
        sync_time: syncTime,
      }),
      headers: {
        Authorization: `Bearer ${syncConfig.token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "更新同步时间失败");
  }
}
