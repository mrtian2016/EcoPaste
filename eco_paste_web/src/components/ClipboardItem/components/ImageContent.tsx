/**
 * 图片内容渲染组件
 */
import { Image } from "antd";
import type { FC } from "react";
import { useSnapshot } from "valtio";
import { authStore } from "@/stores/auth";
import type { ClipboardItem } from "@/types/clipboard";

interface ImageContentProps {
  item: ClipboardItem;
}

const ImageContent: FC<ImageContentProps> = ({ item }) => {
  const { remote_file_url, remote_file_id, value } = item;
  const { token } = useSnapshot(authStore);

  // 优先使用 remote_file_url，如果没有则尝试使用 remote_file_id 或 value 构建 URL
  let fileUrl = remote_file_url;

  if (!fileUrl && remote_file_id) {
    // 如果有 remote_file_id，构建下载 URL
    fileUrl = `/api/v1/files/download/${remote_file_id}`;
  } else if (!fileUrl && value) {
    // 如果 value 是文件 ID，也尝试构建 URL
    fileUrl = `/api/v1/files/download/${value}`;
  }

  if (!fileUrl) {
    return <span className="text-color-2">图片</span>;
  }

  // 构建完整的图片 URL，添加 token 参数用于认证
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || "";
  const imageUrl = `${baseUrl}${fileUrl}?token=${token}`;

  return (
    <Image
      alt="clipboard"
      className="max-h-40 max-w-full rounded object-contain"
      preview={{
        mask: null,
        src: imageUrl,
      }}
      src={imageUrl}
    />
  );
};

export default ImageContent;
