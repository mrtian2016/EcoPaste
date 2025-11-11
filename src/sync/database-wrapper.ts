/**
 * 数据库操作包装器 - 自动集成同步功能
 *
 * 使用方式：
 * import { insertHistory, updateHistory, deleteHistory } from '@/sync/database-wrapper';
 *
 * 这些函数会自动处理同步，无需手动调用 syncEngine
 */
import { warn as LogWarn } from "@tauri-apps/plugin-log";
import {
  deleteHistory as dbDeleteHistory,
  insertHistory as dbInsertHistory,
  selectHistory as dbSelectHistory,
  updateHistory as dbUpdateHistory,
} from "@/database/history";
import type { DatabaseSchemaHistory } from "@/types/database";
import { syncEngine } from "./SyncEngine";
import { syncConfig } from "./syncStore";
import { calculateHash } from "./utils/hash";

/**
 * 插入历史记录（带同步）
 */
export const insertHistory = async (
  data: DatabaseSchemaHistory,
): Promise<void> => {
  // console.log(`[insertHistory] 收到插入请求: ${data.id}, type: ${data.type}`);

  // 添加同步字段
  const itemWithSync: any = {
    ...data,
    device_id: syncConfig.deviceId,
    device_name: syncConfig.deviceName,
    synced: 0, // 初始标记为未同步
  };

  // 计算内容哈希
  if (!itemWithSync.content_hash) {
    itemWithSync.content_hash = await calculateHash(data.type, data.value);
  }

  // 插入本地数据库
  await dbInsertHistory(itemWithSync);

  // 尝试同步到服务器
  if (syncEngine.isEnabled()) {
    try {
      await syncEngine.syncInsert(itemWithSync);
    } catch (error) {
      LogWarn(`同步失败，将在下次连接时重试: ${error}`);
      // 失败不影响本地操作
    }
  }
};

/**
 * 更新历史记录（带同步）
 */
export const updateHistory = async (
  id: string,
  nextData: Partial<DatabaseSchemaHistory>,
): Promise<void> => {
  // 更新本地数据库
  await dbUpdateHistory(id, nextData);

  // 同步更新
  if (syncEngine.isEnabled()) {
    try {
      await syncEngine.syncUpdate(id, nextData);
    } catch (error) {
      LogWarn(`同步更新失败: ${error}`);
    }
  }
};

/**
 * 删除历史记录（带同步）
 */
export const deleteHistory = async (
  data: DatabaseSchemaHistory,
): Promise<void> => {
  const { id } = data;

  // 删除本地数据库
  await dbDeleteHistory(data);

  // 同步删除
  if (syncEngine.isEnabled()) {
    try {
      await syncEngine.syncDelete(id);
    } catch (error) {
      LogWarn(`同步删除失败: ${error}`);
    }
  }
};

/**
 * 批量删除历史记录（带同步）
 */
export const batchDeleteHistory = async (
  items: DatabaseSchemaHistory[],
): Promise<void> => {
  const ids = items.map((item) => item.id);

  // 删除本地数据库
  for (const item of items) {
    await dbDeleteHistory(item);
  }

  // 同步批量删除
  if (syncEngine.isEnabled()) {
    try {
      await syncEngine.syncBatchDelete(ids);
    } catch (error) {
      LogWarn(`同步批量删除失败: ${error}`);
    }
  }
};

/**
 * 查询历史记录（不受同步影响）
 */
export const selectHistory = dbSelectHistory;
