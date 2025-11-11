/**
 * 同步引擎 - 处理本地和远程数据同步
 */

import { emit } from "@tauri-apps/api/event";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
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
import { fetchSyncUpdates, updateDeviceSyncTime } from "./syncApi";
import { syncConfig, syncState } from "./syncStore";
import type { ClipboardItem } from "./types";
import { calculateHash } from "./utils/hash";

// 用于标记正在处理远程同步的数据，防止重复上传
const syncingFromRemote = new Set<string>();

// 用于标记正在写入同步的剪贴板，防止剪贴板监听触发重复插入
let isWritingSyncClipboard = false;

export class SyncEngine {
  private enabled = false;
  private isSyncing = false; // 防止并发同步
  private latestRemoteSyncTime: string | null = null; // 记录最新的远程同步时间
  private syncTimeUpdateTimer: number | null = null; // 定时器ID

  /**
   * 启用同步引擎
   */
  async enable() {
    await attachConsole();
    this.enabled = true;
    this.registerHandlers();
    this.registerConnectionHandler();
  }

  /**
   * 禁用同步引擎
   */
  async disable() {
    this.enabled = false;

    // 清理定时器并立即更新同步时间
    if (this.syncTimeUpdateTimer) {
      clearTimeout(this.syncTimeUpdateTimer);
      this.syncTimeUpdateTimer = null;
    }

    // 如果有未更新的同步时间，立即更新
    if (this.latestRemoteSyncTime) {
      try {
        await updateDeviceSyncTime(
          syncConfig.deviceId,
          this.latestRemoteSyncTime,
        );
        LogInfo(`断开前更新设备同步时间: ${this.latestRemoteSyncTime}`);
        this.latestRemoteSyncTime = null;
      } catch (error) {
        LogError(`断开前更新同步时间失败: ${error}`);
      }
    }
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.enabled && syncState.status === "connected";
  }

  /**
   * 检查是否正在写入同步的剪贴板
   */
  static isWritingSyncClipboard(): boolean {
    return isWritingSyncClipboard;
  }

  /**
   * 注册连接成功处理器
   */
  private registerConnectionHandler() {
    LogInfo("[SyncEngine] 注册连接成功处理器");

    // 在每次连接成功时执行完整双向同步
    syncManager.onConnected(async () => {
      LogInfo("[SyncEngine] 连接成功，开始执行双向同步");
      try {
        await this.fullSync();
      } catch (error) {
        LogError(`连接后双向同步失败: ${error}`);
      }
    });
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

    LogInfo(`[syncInsert] 收到插入请求: ${data.id}, type: ${data.type}`);

    // 检查是否是远程同步的数据，避免重复上传
    if (syncingFromRemote.has(data.id)) {
      LogInfo(`[syncInsert] 跳过远程同步的数据: ${data.id}`);
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
    // 标记正在写入同步的剪贴板，防止剪贴板监听触发
    isWritingSyncClipboard = true;
    LogInfo(
      `[handleRemoteSync] 开始处理远程同步: ${remoteData.id}, type: ${remoteData.type}, isWritingSyncClipboard: true`,
    );

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
          // 提前返回前清除标记
          syncingFromRemote.delete(remoteData.id);
          isWritingSyncClipboard = false;
          LogInfo(
            `[handleRemoteSync] 提前返回清除标记: ${remoteData.id}, isWritingSyncClipboard: false`,
          );
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
        const originalFileName =
          (remoteData as any).remote_file_name ||
          (remoteData as any).remote_file_id;

        // 获取唯一的文件路径（自动处理重名）
        const { getUniqueFilePath } = await import("./utils/file");
        const { filePath: localPath, fileName: uniqueFileName } =
          await getUniqueFilePath(
            saveImagePath,
            originalFileName,
            (remoteData as any).content_hash,
          );

        LogInfo(
          `下载远程图片: ${originalFileName} -> ${uniqueFileName} (${localPath})`,
        );

        await downloadFile((remoteData as any).remote_file_id, localPath);

        // 使用最终的文件名（可能已重命名）
        localData.value = uniqueFileName;
      }

      // 如果是文件列表，下载所有文件
      if (remoteData.type === "files" && (remoteData as any).remote_files) {
        const remoteFiles = JSON.parse((remoteData as any).remote_files);
        const localFiles = [];

        const { appLocalDataDir } = await import("@tauri-apps/api/path");
        const localDataDir = await appLocalDataDir();
        const downloadPath = join(localDataDir, "files");
        if (!(await exists(downloadPath))) {
          await mkdir(downloadPath);
        }

        // 导入文件处理工具
        const { getUniqueFilePath } = await import("./utils/file");

        for (const remoteFile of remoteFiles) {
          // 使用原始文件名，如果没有则使用file_id
          const originalFileName =
            remoteFile.original_name || remoteFile.file_id;

          // 获取唯一的文件路径（自动处理重名）
          // 注意:文件列表的哈希是组合的,这里不传递哈希值
          const { filePath: localPath, fileName: uniqueFileName } =
            await getUniqueFilePath(downloadPath, originalFileName);

          LogInfo(
            `下载远程文件: ${originalFileName} -> ${uniqueFileName} (${localPath})`,
          );

          await downloadFile(remoteFile.file_id, localPath);
          localFiles.push(localPath);
        }

        // 使用本地路径列表
        localData.value = localFiles;
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

      // 更新最新的远程同步时间
      this.updateLatestRemoteSyncTime(remoteData.createTime);
    } finally {
      // 延迟移除标记，避免立即触发同步
      setTimeout(() => {
        syncingFromRemote.delete(remoteData.id);
        isWritingSyncClipboard = false;
        LogInfo(
          `[handleRemoteSync] 清除标记: ${remoteData.id}, isWritingSyncClipboard: false`,
        );
      }, 1000);
    }
  }

  /**
   * 更新最新的远程同步时间（防抖处理）
   * 避免每次 WebSocket 同步都立即发送 HTTP 请求
   */
  private updateLatestRemoteSyncTime(createTime: string): void {
    // 更新最新时间
    if (!this.latestRemoteSyncTime || createTime > this.latestRemoteSyncTime) {
      this.latestRemoteSyncTime = createTime;
    }

    // 清除旧的定时器
    if (this.syncTimeUpdateTimer) {
      clearTimeout(this.syncTimeUpdateTimer);
    }

    // 设置新的定时器，3秒后更新到服务器
    this.syncTimeUpdateTimer = window.setTimeout(async () => {
      if (this.latestRemoteSyncTime) {
        try {
          await updateDeviceSyncTime(
            syncConfig.deviceId,
            this.latestRemoteSyncTime,
          );
          LogInfo(
            `已更新设备同步时间（WebSocket）: ${this.latestRemoteSyncTime}`,
          );
          this.latestRemoteSyncTime = null; // 重置
        } catch (error) {
          LogError(`更新设备同步时间失败: ${error}`);
        }
      }
      this.syncTimeUpdateTimer = null;
    }, 3000); // 3秒防抖
  }

  /**
   * 将数据写入系统剪贴板
   */
  private async writeToSystemClipboard(
    data: DatabaseSchemaHistory,
  ): Promise<void> {
    try {
      if (data.type === "image") {
        // 获取完整路径
        const saveImagePath = await getDefaultSaveImagePath();
        const localPath = join(saveImagePath, data.value);
        data.value = localPath;
      }
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
   * 同步本地未同步的记录到服务器（批量限制）
   * @param batchSize 每批处理的数量，默认50条
   */
  async syncPending(batchSize: number = 50): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    const db = await getDatabase();

    // 只获取指定数量的未同步记录
    const pending = await db
      .selectFrom("history")
      .selectAll()
      .where("synced" as any, "=", 0)
      .orderBy("createTime", "asc") // 优先同步旧数据
      .limit(batchSize)
      .execute();

    if (pending.length === 0) {
      LogInfo("没有待同步的记录");
      syncState.pendingCount = 0;
      return 0;
    }

    LogInfo(`开始同步 ${pending.length} 条未同步记录`);

    let successCount = 0;
    // 逐个同步
    for (const item of pending) {
      try {
        await this.syncInsert(item);
        successCount++;
      } catch (error) {
        LogError(`同步失败: ${item.id}, error: ${error}`);
      }
    }

    // 更新待同步计数
    const remaining = await db
      .selectFrom("history")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("synced" as any, "=", 0)
      .executeTakeFirst();

    syncState.pendingCount = Number(remaining?.count || 0);
    LogInfo(
      `本批同步完成: ${successCount}/${pending.length}, 剩余: ${syncState.pendingCount}`,
    );

    return successCount;
  }

  /**
   * 从服务器拉取新数据（基于设备同步时间的增量同步）
   * @param maxBatches 最多拉取的批次数，默认10批（避免一次拉取过多）
   */
  async syncFromServer(maxBatches: number = 10): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    try {
      let offset = 0;
      let totalSynced = 0;
      let batchCount = 0;
      const batchSize = 50; // 每批50条，减少单次处理量
      let latestCreateTime: string | null = null; // 记录最新的 createTime

      LogInfo("开始从服务器拉取数据（基于设备同步时间）");

      // 使用循环代替递归，使用 offset 分页
      while (batchCount < maxBatches) {
        // 调用新的 HTTP API 获取未同步数据
        const result = await fetchSyncUpdates(
          syncConfig.deviceId,
          batchSize,
          offset,
        );

        if (result.items.length === 0) {
          break;
        }

        LogInfo(`批次 ${batchCount + 1}: 获取到 ${result.items.length} 条记录`);

        // 批量处理数据，减少UI刷新
        for (const item of result.items) {
          await this.handleRemoteSync(item);
          totalSynced++;
          // 记录最新的 createTime
          if (!latestCreateTime || item.createTime > latestCreateTime) {
            latestCreateTime = item.createTime;
          }
        }

        batchCount++;
        offset += result.items.length;

        // 没有更多数据了
        const hasMore = offset < result.total;
        if (!hasMore) {
          break;
        }

        // 如果达到最大批次，提示用户稍后继续
        if (batchCount >= maxBatches && hasMore) {
          LogInfo(
            `已达到最大批次限制(${maxBatches})，剩余数据将在后台继续同步`,
          );
          // 可以在后台继续同步
          this.continueBackgroundSync(undefined, offset);
          break;
        }
      }

      // 统一刷新UI（只刷新一次）
      if (totalSynced > 0) {
        await emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);

        // 更新设备的同步时间为最新记录的时间
        if (latestCreateTime) {
          await updateDeviceSyncTime(syncConfig.deviceId, latestCreateTime);
          LogInfo(`已更新设备同步时间: ${latestCreateTime}`);
        }
      }

      LogInfo(`从服务器同步完成: ${totalSynced} 条记录`);
      return totalSynced;
    } catch (error) {
      LogError(`从服务器同步数据失败: ${error}`);
      throw error;
    }
  }

  /**
   * 后台继续同步（非阻塞）
   */
  private continueBackgroundSync(
    _sinceTime: string | undefined,
    startOffset: number,
  ): void {
    // 异步继续同步，不阻塞当前流程
    setTimeout(async () => {
      try {
        LogInfo(`开始后台同步，offset: ${startOffset}`);
        let offset = startOffset;
        let totalSynced = 0;
        const batchSize = 50;
        let latestCreateTime: string | null = null;

        while (this.isEnabled()) {
          const result = await fetchSyncUpdates(
            syncConfig.deviceId,
            batchSize,
            offset,
          );

          if (result.items.length === 0) {
            break;
          }

          for (const item of result.items) {
            await this.handleRemoteSync(item);
            totalSynced++;
            if (!latestCreateTime || item.createTime > latestCreateTime) {
              latestCreateTime = item.createTime;
            }
          }

          offset += result.items.length;

          // 每处理一批就刷新UI
          await emit(LISTEN_KEY.REFRESH_CLIPBOARD_LIST);

          const hasMore = offset < result.total;
          if (!hasMore) {
            break;
          }

          // 添加延迟，避免占用太多资源
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // 更新设备同步时间
        if (latestCreateTime) {
          await updateDeviceSyncTime(syncConfig.deviceId, latestCreateTime);
          LogInfo(`后台同步完成并更新同步时间: ${latestCreateTime}`);
        }

        LogInfo(`后台同步完成: ${totalSynced} 条记录`);
      } catch (error) {
        LogError(`后台同步失败: ${error}`);
      }
    }, 2000); // 延迟2秒开始后台同步
  }

  /**
   * 执行完整的双向同步（带性能优化）
   * 1. 上传本地未同步的数据到服务器（限制批量）
   * 2. 从服务器拉取新数据到本地（限制批量）
   */
  async fullSync(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    // 防止并发同步
    if (this.isSyncing) {
      LogInfo("已有同步任务在进行中，跳过");
      return;
    }

    this.isSyncing = true;

    try {
      LogInfo("开始执行完整双向同步...");

      // 步骤1: 上传本地未同步的数据（首批最多50条）
      const uploadCount = await this.syncPending(50);
      LogInfo(`首批上传完成: ${uploadCount} 条`);

      // 步骤2: 从服务器拉取新数据（首批最多5批次，250条）
      const downloadCount = await this.syncFromServer(5);
      LogInfo(`首批下载完成: ${downloadCount} 条`);

      // 更新最后同步时间
      syncState.lastSyncTime = new Date().toISOString();
      LogInfo("首批双向同步完成");

      // 如果还有未同步的数据，在后台继续
      if (syncState.pendingCount > 0) {
        LogInfo(`还有 ${syncState.pendingCount} 条待上传，将在后台继续`);
        this.continueUploadInBackground();
      }
    } catch (error) {
      LogError(`双向同步失败: ${error}`);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 后台继续上传未同步的数据
   */
  private continueUploadInBackground(): void {
    setTimeout(async () => {
      try {
        while (this.isEnabled() && syncState.pendingCount > 0) {
          const count = await this.syncPending(20); // 每批20条
          if (count === 0) {
            break;
          }
          LogInfo(`后台上传批次完成: ${count} 条`);
          // 添加延迟，避免占用太多资源
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        LogInfo("后台上传全部完成");
      } catch (error) {
        LogError(`后台上传失败: ${error}`);
      }
    }, 3000); // 延迟3秒开始
  }
}

// 导出单例
export const syncEngine = new SyncEngine();
