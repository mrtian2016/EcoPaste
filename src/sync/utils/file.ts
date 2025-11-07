/**
 * 文件处理工具函数
 */

import { exists, readFile } from "@tauri-apps/plugin-fs";
import { error as LogError } from "@tauri-apps/plugin-log";
import { join } from "@/utils/path";

/**
 * 计算文件的SHA-256哈希值
 */
async function calculateFileHashFromPath(filePath: string): Promise<string> {
  const fileContent = await readFile(filePath);
  const hashBuffer = await crypto.subtle.digest("SHA-256", fileContent);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 获取不重复的文件路径
 * 如果文件已存在且哈希值不同,则自动添加 _1, _2 等后缀
 *
 * @param directory 文件所在目录
 * @param fileName 文件名
 * @param fileHash 文件内容的哈希值(可选,如果提供则会比对)
 * @returns 不重复的完整文件路径和最终使用的文件名
 */
export async function getUniqueFilePath(
  directory: string,
  fileName: string,
  fileHash?: string,
): Promise<{ filePath: string; fileName: string }> {
  const originalPath = join(directory, fileName);

  // 如果文件不存在,直接返回原路径
  if (!(await exists(originalPath))) {
    return { fileName, filePath: originalPath };
  }

  // 如果文件存在,检查哈希值
  if (fileHash) {
    try {
      const existingHash = await calculateFileHashFromPath(originalPath);
      // 如果哈希值相同,说明是同一个文件,直接返回
      if (existingHash === fileHash) {
        return { fileName, filePath: originalPath };
      }
    } catch (error) {
      // 读取文件失败,继续尝试重命名
      LogError(`读取已存在文件失败: ${error}`);
    }
  }

  // 文件存在且内容不同,需要重命名
  // 分离文件名和扩展名
  const lastDotIndex = fileName.lastIndexOf(".");
  const baseName =
    lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : "";

  // 尝试添加 _1, _2, _3 ... 直到找到不存在的文件名
  let counter = 1;
  let newFileName: string;
  let newFilePath: string;

  while (true) {
    newFileName = `${baseName}_${counter}${extension}`;
    newFilePath = join(directory, newFileName);

    // 检查新文件名是否存在
    if (!(await exists(newFilePath))) {
      return { fileName: newFileName, filePath: newFilePath };
    }

    // 如果新文件存在,检查哈希值
    if (fileHash) {
      try {
        const existingHash = await calculateFileHashFromPath(newFilePath);
        // 如果哈希值相同,说明是同一个文件
        if (existingHash === fileHash) {
          return { fileName: newFileName, filePath: newFilePath };
        }
      } catch (_error) {
        // 读取失败,继续尝试下一个数字
      }
    }

    counter++;

    // 防止无限循环
    if (counter > 9999) {
      throw new Error(`无法找到唯一的文件名: ${fileName}`);
    }
  }
}
