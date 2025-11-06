/**
 * 文件上传/下载 API
 */
import { getHttpServerUrl, syncConfig } from "./syncStore";

/**
 * 上传文件到服务器
 */
export async function uploadFile(
  filePath: string,
  deviceId?: string,
): Promise<{ fileId: string; fileUrl: string }> {
  const baseUrl = getHttpServerUrl();

  if (!syncConfig.token) {
    throw new Error("未登录");
  }

  // 读取文件内容
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const fileContent = await readFile(filePath);

  // 创建 FormData
  const formData = new FormData();
  const fileName = filePath.split(/[\\/]/).pop() || "file";
  const blob = new Blob([fileContent]);
  formData.append("file", blob, fileName);

  if (deviceId) {
    formData.append("device_id", deviceId);
  }

  const response = await fetch(`${baseUrl}/api/v1/files/upload`, {
    body: formData,
    headers: {
      Authorization: `Bearer ${syncConfig.token}`,
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "文件上传失败");
  }

  const result = await response.json();

  return {
    fileId: result.data.file_id,
    fileUrl: result.data.file_url,
  };
}

/**
 * 下载文件从服务器
 */
export async function downloadFile(
  fileId: string,
  savePath: string,
): Promise<void> {
  const baseUrl = getHttpServerUrl();

  if (!syncConfig.token) {
    throw new Error("未登录");
  }

  const response = await fetch(
    `${baseUrl}/api/v1/files/download/${fileId}?token=${syncConfig.token}`,
    {
      headers: {
        Authorization: `Bearer ${syncConfig.token}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "文件下载失败");
  }

  const arrayBuffer = await response.arrayBuffer();

  // 保存文件
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  await writeFile(savePath, new Uint8Array(arrayBuffer));
}
