/**
 * 文件列表内容渲染组件
 */
import { Flex } from "antd";
import type { FC } from "react";
import { useSnapshot } from "valtio";
import UnoIcon from "@/components/UnoIcon";
import { authStore } from "@/stores/auth";
import type { ClipboardItem } from "@/types/clipboard";

interface FilesContentProps {
  item: ClipboardItem;
}

interface FileItem {
  name: string;
  path?: string;
  size?: number;
}

const FilesContent: FC<FilesContentProps> = ({ item }) => {
  const { value, remote_file_url } = item;
  const { token } = useSnapshot(authStore);

  // 解析文件列表
  let files: FileItem[] = [];
  try {
    files = JSON.parse(value || "[]");
  } catch {
    files = [];
  }

  if (files.length === 0) {
    return <span className="text-color-2">文件列表</span>;
  }

  // 如果只有一个文件且是图片
  if (files.length === 1 && remote_file_url) {
    const baseUrl =
      import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || "";
    const imageUrl = `${baseUrl}${remote_file_url}?token=${token}`;
    return (
      <img
        alt={files[0].name}
        className="max-h-40 max-w-full rounded object-contain"
        src={imageUrl}
      />
    );
  }

  // 渲染文件列表
  const maxDisplay = 3;
  const displayFiles = files.slice(0, maxDisplay);
  const remaining = files.length - maxDisplay;

  return (
    <Flex className="w-full" gap="small" vertical>
      {displayFiles.map((file) => (
        <Flex align="center" gap="small" key={file.name}>
          <UnoIcon className="text-color-2" name="i-hugeicons:file-01" />
          <span className="truncate text-sm">{file.name}</span>
        </Flex>
      ))}
      {remaining > 0 && (
        <span className="text-color-2 text-xs">还有 {remaining} 个文件...</span>
      )}
    </Flex>
  );
};

export default FilesContent;
