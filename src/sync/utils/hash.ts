/**
 * 内容哈希计算工具
 */
import { error as LogError } from "@tauri-apps/plugin-log";

/**
 * 计算文件内容哈希（SHA-256）
 * 对于图片和文件类型，读取文件内容计算哈希，而不是使用文件名
 */
async function calculateFileHash(filePath: string): Promise<string> {
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const fileContent = await readFile(filePath);

  const hashBuffer = await crypto.subtle.digest("SHA-256", fileContent);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

/**
 * 计算内容哈希（SHA-256）
 * 对于图片和文件类型，使用文件内容计算哈希
 * 对于文本类型，使用文本内容计算哈希
 */
export async function calculateHash(
  type: string,
  value: string,
): Promise<string> {
  // 对于图片类型，计算文件内容哈希
  if (type === "image") {
    try {
      // value 可能是完整路径或文件名，需要拼接完整路径
      const { getDefaultSaveImagePath } = await import(
        "tauri-plugin-clipboard-x-api"
      );
      const { join } = await import("@/utils/path");

      let filePath = value;
      // 如果不是绝对路径，拼接默认图片路径
      if (!value.startsWith("/") && !value.match(/^[A-Za-z]:\\/)) {
        const saveImagePath = await getDefaultSaveImagePath();
        filePath = join(saveImagePath, value);
      }

      const fileHash = await calculateFileHash(filePath);
      return fileHash;
    } catch (error) {
      LogError(`计算图片文件哈希失败，使用文件名: ${error}`);
      // 降级：使用文件名计算哈希
      const content = `${type}:${value}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  }

  // 对于文件列表类型，计算所有文件内容的联合哈希
  if (type === "files") {
    try {
      const files = JSON.parse(value) as string[];
      const fileHashes: string[] = [];

      for (const filePath of files) {
        const fileHash = await calculateFileHash(filePath);
        fileHashes.push(fileHash);
      }

      // 将所有文件哈希组合后再次哈希
      const combinedHash = fileHashes.join(":");
      const encoder = new TextEncoder();
      const data = encoder.encode(combinedHash);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (error) {
      LogError(`计算文件列表哈希失败，使用文件路径: ${error}`);
      // 降级：使用文件路径计算哈希
      const content = `${type}:${value}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  }

  // 对于文本类型，使用文本内容计算哈希
  const content = `${type}:${value}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

/**
 * 验证哈希是否匹配
 */
export async function verifyHash(
  type: string,
  value: string,
  expectedHash: string,
): Promise<boolean> {
  const actualHash = await calculateHash(type, value);
  return actualHash === expectedHash;
}
