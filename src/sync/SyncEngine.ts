/**
 * 同步引擎 - 处理本地和远程数据同步
 */

import { emit } from "@tauri-apps/api/event";
import {
  attachConsole,
  error as LogError,
  info as LogInfo,
} from "@tauri-apps/plugin-log";
import { getDefaultSaveImagePath } from "tauri-plugin-clipboard-x-api";
import { LISTEN_KEY } from "@/constants";
import { getDatabase } from "@/database";
import { writeToClipboard } from "@/plugins/clipboard";
import type { DatabaseSchemaHistory } from "@/types/database";
import { join } from "@/utils/path";
import { downloadFile, uploadFile } from "./fileApi";
import { syncManager } from "./SyncManager";
import { syncConfig, syncState } from "./syncStore";
import type { ClipboardItem } from "./types";
import { calculateHash } from "./utils/hash";

// 用于标记正在处理远程同步的数据，防止重复上传
const syncingFromRemote = new Set<string>();

export class SyncEngine {
  private enabled = false;

  /**
   * 启用同步引擎
   */
  async enable() {
    await attachConsole();
    this.enabled = true;
    this.registerHandlers();
  }

  /**
   * 禁用同步引擎
   */
  disable() {
    this.enabled = false;
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled && syncState.status === "connected";
  }

  /**
   * 注册同步事件处理器
   */
  private registerHandlers() {
    LogInfo("[SyncEngine] 注册同步事件处理器");

    // 处理来自其他设备的同步
    syncManager.onSync(async (item) => {
      LogInfo(`[SyncEngine] onSync 回调被调用，item: ${JSON.stringify(item)}`);
      await this.handleRemoteSync(item);
      // 发送事件通知 UI 刷新列表
      await emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);
      LogInfo("已发送刷新列表事件");
    });

    // 处理删除
    syncManager.onDelete(async (id) => {
      await this.handleRemoteDelete(id);
      // 发送事件通知 UI 刷新列表
      await emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);
      LogInfo("已发送刷新列表事件");
    });

    // 处理批量删除
    syncManager.onBatchDelete(async (ids) => {
      await this.handleRemoteBatchDelete(ids);
      // 发送事件通知 UI 刷新列表
      await emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);
      LogInfo("已发送刷新列表事件");
    });

    // 处理更新
    syncManager.onUpdate(async (id, updates) => {
      await this.handleRemoteUpdate(id, updates);
      // 发送事件通知 UI 刷新列表
      await emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);
      LogInfo("已发送刷新列表事件");
    });

    // 处理历史清空
    syncManager.onClearHistory(async () => {
      await this.handleRemoteClearHistory();
      // 发送事件通知 UI 刷新列表
      await emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);
      LogInfo("已发送刷新列表事件");
    });

    // 处理时间戳更新
    syncManager.onTimestampUpdate(async (id, createTime) => {
      await this.handleRemoteTimestampUpdate(id, createTime);
      // 发送事件通知 UI 刷新列表
      await emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);
      LogInfo("已发送刷新列表事件");
    });
  }

  /**
   * 同步插入操作到服务器
   */
  async syncInsert(data: any): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    // 检查是否是远程同步的数据，避免重复上传
    if (syncingFromRemote.has(data.id)) {
      LogInfo(`跳过远程同步的数据: ${data.id}`);
      return;
    }

    try {
      // 计算内容哈希
      const hash = await calculateHash(data.type, data.value);

      // 准备同步数据
      const syncData: any = {
        ...data,
        content_hash: hash,
        device_id: syncConfig.deviceId,
        device_name: syncConfig.deviceName,
        synced: 1,
      };

      // 如果是图片，需要先上传文件
      if (data.type === "image") {
        LogInfo(`上传图片到服务器，原始数据: ${JSON.stringify(data)}`);
        // 如果是图片 需要拼接完整路径
        const saveImagePath = await getDefaultSaveImagePath();
        const localFilePath = join(saveImagePath, data.value);
        LogInfo(`图片完整路径: ${localFilePath}`);

        const { fileId, fileUrl, fileName } = await uploadFile(
          localFilePath,
          syncConfig.deviceId,
        );
        LogInfo(`图片上传成功: fileId=${fileId}, fileName=${fileName}`);

        // 保存file_id、url和原始文件名（使用服务器返回的文件名）
        syncData.remote_file_id = fileId;
        syncData.remote_file_url = fileUrl;
        syncData.remote_file_name = fileName; // 使用服务器返回的原始文件名
      }

      // 如果是文件列表，需要上传每个文件
      if (data.type === "files" && data.value) {
        LogInfo(`上传文件到服务器: ${data.value}`);
        const files = JSON.parse(data.value);
        const uploadedFiles = [];

        for (const filePath of files) {
          const { fileId, fileUrl, fileName } = await uploadFile(
            filePath,
            syncConfig.deviceId,
          );
          // 使用服务器返回的原始文件名
          uploadedFiles.push({
            file_id: fileId,
            file_url: fileUrl,
            original_name: fileName, // 使用服务器返回的文件名
            original_path: filePath,
          });
        }

        syncData.remote_files = JSON.stringify(uploadedFiles);
      }

      // 发送到服务器
      await syncManager.syncClipboard(syncData);

      // 更新本地状态
      const db = await getDatabase();
      await db
        .updateTable("history")
        .set({ synced: 1 })
        .where("id", "=", data.id)
        .execute();
    } catch (error) {
      LogError(`同步插入失败: ${error}`);

      // 标记为未同步
      const db = await getDatabase();
      await db
        .updateTable("history")
        .set({ synced: 0 })
        .where("id", "=", data.id)
        .execute();

      throw error;
    }
  }

  /**
   * 同步更新操作到服务器
   */
  async syncUpdate(id: string, updates: any): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await syncManager.updateClipboard(id, updates);
    } catch (error) {
      LogError(`同步更新失败: ${error}`);
      throw error;
    }
  }

  /**
   * 同步删除操作到服务器
   */
  async syncDelete(id: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await syncManager.deleteClipboard(id);
    } catch (error) {
      LogError(`同步删除失败: ${error}`);
      throw error;
    }
  }

  /**
   * 同步批量删除到服务器
   */
  async syncBatchDelete(ids: string[]): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      await syncManager.deleteClipboardBatch(ids);
    } catch (error) {
      LogError(`同步批量删除失败: ${error}`);
      throw error;
    }
  }

  /**
   * 处理来自远程的同步数据
   */
  private async handleRemoteSync(remoteData: ClipboardItem): Promise<void> {
    const db = await getDatabase();

    // 标记为远程同步数据，防止重复上传
    syncingFromRemote.add(remoteData.id);

    try {
      // 检查本地是否已存在
      const existing = await db
        .selectFrom("history")
        .selectAll()
        .where("id", "=", remoteData.id)
        .executeTakeFirst();

      if (existing) {
        // 比较时间戳，保留更新的
        const localTime = new Date(existing.createTime).getTime();
        const remoteTime = new Date(remoteData.createTime).getTime();

        if (remoteTime <= localTime) {
          LogInfo(`本地数据更新，跳过: ${remoteData.id}`);
          return;
        }
      }

      // 准备本地数据（过滤掉后端特有的字段）
      const { _is_duplicate, ...cleanRemoteData } = remoteData as any;

      const localData: any = {
        ...cleanRemoteData,
        synced: 1, // 标记为已同步，避免再次上传
      };

      // 如果是图片，下载到本地
      if (remoteData.type === "image" && localData.remote_file_id) {
        const saveImagePath = await getDefaultSaveImagePath();
        // 使用原始文件名，如果没有则使用file_id
        const fileName =
          (remoteData as any).remote_file_name ||
          (remoteData as any).remote_file_id;
        const localPath = join(saveImagePath, fileName);

        LogInfo(`下载远程图片: ${fileName} -> ${localPath}`);

        await downloadFile((remoteData as any).remote_file_id, localPath);

        // 使用本地路径（只保存文件名）
        localData.value = fileName;
      }

      // 如果是文件列表，下载所有文件
      if (remoteData.type === "files" && (remoteData as any).remote_files) {
        const remoteFiles = JSON.parse((remoteData as any).remote_files);
        const localFiles = [];

        const { downloadDir } = await import("@tauri-apps/api/path");
        const downloadPath = await downloadDir();

        for (const remoteFile of remoteFiles) {
          // 使用原始文件名，如果没有则使用file_id
          const fileName = remoteFile.original_name || remoteFile.file_id;
          const localPath = join(downloadPath, fileName);

          LogInfo(`下载远程文件: ${fileName} -> ${localPath}`);

          await downloadFile(remoteFile.file_id, localPath);
          localFiles.push(localPath);
        }

        // 使用本地路径列表
        localData.value = JSON.stringify(localFiles);
      }

      // 移除远程特有字段，避免插入数据库时出错
      delete localData.remote_file_id;
      delete localData.remote_file_url;
      delete localData.remote_file_name;
      delete localData.remote_files;
      delete localData.is_duplicate;

      // 写入本地数据库
      if (existing) {
        await db
          .updateTable("history")
          .set(localData)
          .where("id", "=", remoteData.id)
          .execute();

        LogInfo(`更新本地数据: ${remoteData.id}`);
      } else {
        await db.insertInto("history").values(localData).execute();

        LogInfo(`插入远程数据: ${remoteData.id}`);
      }

      // 写入系统剪贴板
      await this.writeToSystemClipboard(localData as DatabaseSchemaHistory);
    } finally {
      // 延迟移除标记，避免立即触发同步
      setTimeout(() => {
        syncingFromRemote.delete(remoteData.id);
      }, 1000);
    }
  }

  /**
   * 将数据写入系统剪贴板
   */
  private async writeToSystemClipboard(
    data: DatabaseSchemaHistory,
  ): Promise<void> {
    try {
      await writeToClipboard(data);
      LogInfo(`已写入系统剪贴板: ${data.type}`);
    } catch (error) {
      LogError(`写入剪贴板失败: ${error}`);
    }
  }

  /**
   * 处理远程删除
   */
  private async handleRemoteDelete(id: string): Promise<void> {
    const db = await getDatabase();

    await db.deleteFrom("history").where("id", "=", id).execute();

    LogInfo(`删除本地数据: ${id}`);
  }

  /**
   * 处理远程批量删除
   */
  private async handleRemoteBatchDelete(ids: string[]): Promise<void> {
    const db = await getDatabase();

    await db.deleteFrom("history").where("id", "in", ids).execute();

    LogInfo(`批量删除本地数据: ${ids.length}`);
  }

  /**
   * 处理远程更新
   */
  private async handleRemoteUpdate(
    id: string,
    updates: Partial<ClipboardItem>,
  ): Promise<void> {
    const db = await getDatabase();

    await db
      .updateTable("history")
      .set(updates as any)
      .where("id", "=", id)
      .execute();

    LogInfo(`更新本地数据: ${id}, updates: ${JSON.stringify(updates)}`);
  }

  /**
   * 处理远程清空历史
   */
  private async handleRemoteClearHistory(): Promise<void> {
    const db = await getDatabase();

    await db.deleteFrom("history").execute();

    LogInfo("清空本地历史");
  }

  /**
   * 处理远程时间戳更新
   */
  private async handleRemoteTimestampUpdate(
    id: string,
    createTime: string,
  ): Promise<void> {
    const db = await getDatabase();

    await db
      .updateTable("history")
      .set({ createTime })
      .where("id", "=", id)
      .execute();

    LogInfo(`更新时间戳: ${id}, createTime: ${createTime}`);
  }

  /**
   * 同步所有未同步的记录
   */
  async syncPending(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const db = await getDatabase();

    // 获取所有未同步的记录
    const pending = await db
      .selectFrom("history")
      .selectAll()
      .where("synced" as any, "=", 0)
      .execute();

    LogInfo(`发现 ${pending.length} 条未同步记录`);

    // 逐个同步
    for (const item of pending) {
      try {
        await this.syncInsert(item);
      } catch (error) {
        LogError(`同步失败: ${item.id}, error: ${error}`);
      }
    }

    syncState.pendingCount = 0;
  }
}

// 导出单例
export const syncEngine = new SyncEngine();
