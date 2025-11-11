/**
 * 文件上传 API 端点定义
 */

import { apiClient } from "../client";

export interface FileUploadResponse {
  success: boolean;
  data: {
    file_id: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    file_url: string;
    content_type: "image" | "file";
  };
}

export const filesApi = {
  /**
   * 上传文件（图片或其他文件）
   */
  upload: (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
