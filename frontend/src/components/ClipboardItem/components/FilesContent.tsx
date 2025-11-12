/**
 * 文件列表内容渲染组件
 */
import { Flex, Image, Modal, message, Spin } from "antd";
import { type FC, useState } from "react";
import { useSnapshot } from "valtio";
import UnoIcon from "@/components/UnoIcon";
import { authStore } from "@/stores/auth";
import type { ClipboardItem } from "@/types/clipboard";
import { getServerBaseUrl } from "@/utils/api";
import {
  isAudioFile,
  isImageFile,
  isTextFile,
  isVideoFile,
} from "@/utils/file";

interface FilesContentProps {
  item: ClipboardItem;
}

interface FileItem {
  file_id?: string;
  file_url?: string;
  original_name?: string;
  original_path?: string;
  name?: string; // 兼容旧版本
  path?: string;
  size?: number;
}

const FilesContent: FC<FilesContentProps> = ({ item }) => {
  const { value, remote_files } = item;
  const { token } = useSnapshot(authStore);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mediaPreviewVisible, setMediaPreviewVisible] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [mediaPreviewTitle, setMediaPreviewTitle] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "audio">("video");

  // 解析文件列表 - 优先使用 remote_files
  let files: FileItem[] = [];
  try {
    const jsonStr = remote_files || value || "[]";
    files = JSON.parse(jsonStr);
  } catch {
    files = [];
  }

  if (files.length === 0) {
    return <span className="text-color-2">文件列表</span>;
  }

  // 构建图片 URL 的辅助函数
  const buildImageUrl = (fileId: string) => {
    return `${getServerBaseUrl()}/api/v1/files/download/${fileId}?token=${token}`;
  };

  // 检查是否全部是图片
  const allImages = files.every(
    (file) => file.file_id && isImageFile(file.original_name || file.name),
  );

  // 获取所有图片的 URL
  const imageUrls = files
    .filter(
      (file) => file.file_id && isImageFile(file.original_name || file.name),
    )
    .map((file) => ({
      fileId: file.file_id!,
      fileName: file.original_name || file.name || "图片",
      url: buildImageUrl(file.file_id!),
    }));

  // 获取文件内容
  const fetchFileContent = async (fileId: string, fileName: string) => {
    setLoading(true);
    setPreviewTitle(fileName);
    setPreviewVisible(true);

    try {
      const fileUrl = `${getServerBaseUrl()}/api/v1/files/download/${fileId}?token=${token}`;

      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("文件下载失败");
      }

      const content = await response.text();
      setPreviewContent(content);
    } catch (_error) {
      message.error("文件预览失败");
      setPreviewContent("文件预览失败");
    } finally {
      setLoading(false);
    }
  };

  // 打开媒体文件预览
  const openMediaPreview = (
    fileId: string,
    fileName: string,
    type: "video" | "audio",
  ) => {
    const mediaUrl = `${getServerBaseUrl()}/api/v1/files/download/${fileId}?token=${token}`;
    setMediaPreviewUrl(mediaUrl);
    setMediaPreviewTitle(fileName);
    setMediaType(type);
    setMediaPreviewVisible(true);
  };

  // 关闭媒体预览
  const closeMediaPreview = () => {
    setMediaPreviewVisible(false);
    // 立即清空 URL 停止播放
    setMediaPreviewUrl("");
  };

  // 如果只有一个文件
  if (files.length === 1) {
    const file = files[0];
    // 优先使用 original_name，兼容旧的 name 字段
    const fileName = file.original_name || file.name;
    const isImage = isImageFile(fileName);
    const isText = isTextFile(fileName);
    const isVideo = isVideoFile(fileName);
    const isAudio = isAudioFile(fileName);

    // 图片预览
    if (isImage && file.file_id) {
      const imageUrl = `${getServerBaseUrl()}/api/v1/files/download/${file.file_id}?token=${token}`;

      return (
        <Image
          alt={fileName || "image"}
          className="max-h-40 max-w-full rounded object-contain"
          preview={{
            mask: null,
            src: imageUrl,
          }}
          src={imageUrl}
        />
      );
    }

    // 视频预览
    if (isVideo && file.file_id) {
      return (
        <>
          <Flex
            align="center"
            className="cursor-pointer rounded bg-color-2 px-3 py-2 transition hover:bg-color-3"
            gap="small"
            onClick={(e) => {
              e.stopPropagation();
              openMediaPreview(file.file_id!, fileName || "视频", "video");
            }}
          >
            <UnoIcon
              className="text-color-2 text-lg"
              name="i-hugeicons:video-01"
            />
            <span className="flex-1 truncate text-sm">{fileName}</span>
            <UnoIcon className="text-color-3" name="i-hugeicons:view" />
          </Flex>

          {/* 视频/音频预览 Modal */}
          <Modal
            footer={null}
            onCancel={closeMediaPreview}
            open={mediaPreviewVisible}
            title={mediaPreviewTitle}
            width={800}
          >
            {mediaPreviewUrl &&
              (mediaType === "video" ? (
                <video
                  className="w-full rounded"
                  controls
                  key={mediaPreviewUrl}
                  src={mediaPreviewUrl}
                >
                  您的浏览器不支持视频播放
                </video>
              ) : (
                <Flex
                  align="center"
                  className="w-full py-4"
                  gap="small"
                  vertical
                >
                  <UnoIcon
                    className="text-4xl text-color-2"
                    name="i-hugeicons:music-note-03"
                  />
                  <audio
                    className="w-full"
                    controls
                    key={mediaPreviewUrl}
                    src={mediaPreviewUrl}
                  >
                    您的浏览器不支持音频播放
                  </audio>
                </Flex>
              ))}
          </Modal>
        </>
      );
    }

    // 音频预览
    if (isAudio && file.file_id) {
      return (
        <>
          <Flex
            align="center"
            className="cursor-pointer rounded bg-color-2 px-3 py-2 transition hover:bg-color-3"
            gap="small"
            onClick={(e) => {
              e.stopPropagation();
              openMediaPreview(file.file_id!, fileName || "音频", "audio");
            }}
          >
            <UnoIcon
              className="text-color-2 text-lg"
              name="i-hugeicons:music-note-03"
            />
            <span className="flex-1 truncate text-sm">{fileName}</span>
            <UnoIcon className="text-color-3" name="i-hugeicons:view" />
          </Flex>

          {/* 视频/音频预览 Modal */}
          <Modal
            footer={null}
            onCancel={closeMediaPreview}
            open={mediaPreviewVisible}
            title={mediaPreviewTitle}
            width={800}
          >
            {mediaPreviewUrl &&
              (mediaType === "video" ? (
                <video
                  className="w-full rounded"
                  controls
                  key={mediaPreviewUrl}
                  src={mediaPreviewUrl}
                >
                  您的浏览器不支持视频播放
                </video>
              ) : (
                <Flex
                  align="center"
                  className="w-full py-4"
                  gap="small"
                  vertical
                >
                  <UnoIcon
                    className="text-4xl text-color-2"
                    name="i-hugeicons:music-note-03"
                  />
                  <audio
                    className="w-full"
                    controls
                    key={mediaPreviewUrl}
                    src={mediaPreviewUrl}
                  >
                    您的浏览器不支持音频播放
                  </audio>
                </Flex>
              ))}
          </Modal>
        </>
      );
    }

    // 文本文件预览
    if (isText && file.file_id) {
      return (
        <>
          <Flex
            align="center"
            className="cursor-pointer rounded bg-color-2 px-3 py-2 transition hover:bg-color-3"
            gap="small"
            onClick={(e) => {
              e.stopPropagation();
              fetchFileContent(file.file_id!, fileName || "文本文件");
            }}
          >
            <UnoIcon
              className="text-color-2 text-lg"
              name="i-hugeicons:file-01"
            />
            <span className="flex-1 truncate text-sm">{fileName}</span>
            <UnoIcon className="text-color-3" name="i-hugeicons:view" />
          </Flex>

          {/* 文本文件预览 Modal */}
          <Modal
            footer={null}
            onCancel={() => setPreviewVisible(false)}
            open={previewVisible}
            title={previewTitle}
            width={800}
          >
            <Spin spinning={loading}>
              <pre className="max-h-[60vh] overflow-auto rounded bg-color-2 p-4 text-sm">
                {previewContent || "暂无内容"}
              </pre>
            </Spin>
          </Modal>
        </>
      );
    }
  }

  // 如果全部是图片且有多张，显示图片列表
  if (allImages && files.length > 1) {
    const maxDisplay = 3;
    const displayFiles = files.slice(0, maxDisplay);
    const remaining = files.length - maxDisplay;

    return (
      <>
        <Flex className="w-full" gap="small" vertical>
          {displayFiles.map((file, index) => {
            const fileName =
              file.original_name || file.name || `图片 ${index + 1}`;
            return (
              <Flex
                align="center"
                className="cursor-pointer transition hover:text-primary"
                gap="small"
                key={file.file_id || fileName}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                  setImagePreviewVisible(true);
                }}
              >
                <UnoIcon className="text-color-2" name="i-hugeicons:image-02" />
                <span className="flex-1 truncate text-sm">{fileName}</span>
                <UnoIcon
                  className="text-color-3 text-xs"
                  name="i-hugeicons:view"
                />
              </Flex>
            );
          })}
          {remaining > 0 && (
            <span className="text-color-2 text-xs">
              还有 {remaining} 张图片...
            </span>
          )}
        </Flex>

        {/* 图片预览组 */}
        <div style={{ display: "none" }}>
          <Image.PreviewGroup
            preview={{
              current: currentImageIndex,
              onChange: (current) => {
                setCurrentImageIndex(current);
              },
              onVisibleChange: (visible) => {
                setImagePreviewVisible(visible);
              },
              visible: imagePreviewVisible,
            }}
          >
            {imageUrls.map((img) => (
              <Image key={img.fileId} src={img.url} />
            ))}
          </Image.PreviewGroup>
        </div>
      </>
    );
  }

  // 渲染混合文件列表（图片、文本、视频、音频、其他文件）
  const maxDisplay = 3;
  const displayFiles = files.slice(0, maxDisplay);
  const remaining = files.length - maxDisplay;

  return (
    <>
      <Flex className="w-full" gap="small" vertical>
        {displayFiles.map((file, index) => {
          const fileName =
            file.original_name || file.name || `文件 ${index + 1}`;
          const isText = isTextFile(fileName);
          const isImage = isImageFile(fileName);
          const isVideo = isVideoFile(fileName);
          const isAudio = isAudioFile(fileName);

          // 如果是图片，点击预览
          if (isImage && file.file_id) {
            const imageIndex = imageUrls.findIndex(
              (img) => img.fileId === file.file_id,
            );
            return (
              <Flex
                align="center"
                className="cursor-pointer transition hover:text-primary"
                gap="small"
                key={file.file_id || fileName}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(imageIndex);
                  setImagePreviewVisible(true);
                }}
              >
                <UnoIcon className="text-color-2" name="i-hugeicons:image-02" />
                <span className="flex-1 truncate text-sm">{fileName}</span>
                <UnoIcon
                  className="text-color-3 text-xs"
                  name="i-hugeicons:view"
                />
              </Flex>
            );
          }

          // 如果是视频，点击预览
          if (isVideo && file.file_id) {
            return (
              <Flex
                align="center"
                className="cursor-pointer transition hover:text-primary"
                gap="small"
                key={file.file_id || fileName}
                onClick={(e) => {
                  e.stopPropagation();
                  openMediaPreview(file.file_id!, fileName, "video");
                }}
              >
                <UnoIcon className="text-color-2" name="i-hugeicons:video-01" />
                <span className="flex-1 truncate text-sm">{fileName}</span>
                <UnoIcon
                  className="text-color-3 text-xs"
                  name="i-hugeicons:view"
                />
              </Flex>
            );
          }

          // 如果是音频，点击预览
          if (isAudio && file.file_id) {
            return (
              <Flex
                align="center"
                className="cursor-pointer transition hover:text-primary"
                gap="small"
                key={file.file_id || fileName}
                onClick={(e) => {
                  e.stopPropagation();
                  openMediaPreview(file.file_id!, fileName, "audio");
                }}
              >
                <UnoIcon
                  className="text-color-2"
                  name="i-hugeicons:music-note-03"
                />
                <span className="flex-1 truncate text-sm">{fileName}</span>
                <UnoIcon
                  className="text-color-3 text-xs"
                  name="i-hugeicons:view"
                />
              </Flex>
            );
          }

          // 如果是文本，点击预览文本
          return (
            <Flex
              align="center"
              className={
                isText && file.file_id
                  ? "cursor-pointer transition hover:text-primary"
                  : ""
              }
              gap="small"
              key={file.file_id || fileName}
              onClick={
                isText && file.file_id
                  ? (e) => {
                      e.stopPropagation();
                      fetchFileContent(file.file_id!, fileName);
                    }
                  : undefined
              }
            >
              <UnoIcon className="text-color-2" name="i-hugeicons:file-01" />
              <span className="flex-1 truncate text-sm">{fileName}</span>
              {isText && file.file_id && (
                <UnoIcon
                  className="text-color-3 text-xs"
                  name="i-hugeicons:view"
                />
              )}
            </Flex>
          );
        })}
        {remaining > 0 && (
          <span className="text-color-2 text-xs">
            还有 {remaining} 个文件...
          </span>
        )}
      </Flex>

      {/* 图片预览组（用于混合文件列表） */}
      {imageUrls.length > 0 && (
        <div style={{ display: "none" }}>
          <Image.PreviewGroup
            preview={{
              current: currentImageIndex,
              onChange: (current) => {
                setCurrentImageIndex(current);
              },
              onVisibleChange: (visible) => {
                setImagePreviewVisible(visible);
              },
              visible: imagePreviewVisible,
            }}
          >
            {imageUrls.map((img) => (
              <Image key={img.fileId} src={img.url} />
            ))}
          </Image.PreviewGroup>
        </div>
      )}

      {/* 视频/音频预览 Modal */}
      <Modal
        footer={null}
        onCancel={closeMediaPreview}
        open={mediaPreviewVisible}
        title={mediaPreviewTitle}
        width={800}
      >
        {mediaType === "video" ? (
          <video className="w-full rounded" controls src={mediaPreviewUrl}>
            您的浏览器不支持视频播放
          </video>
        ) : (
          <Flex align="center" className="w-full py-4" gap="small" vertical>
            <UnoIcon
              className="text-4xl text-color-2"
              name="i-hugeicons:music-note-03"
            />
            <audio className="w-full" controls src={mediaPreviewUrl}>
              您的浏览器不支持音频播放
            </audio>
          </Flex>
        )}
      </Modal>

      {/* 文本文件预览 Modal */}
      <Modal
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        open={previewVisible}
        title={previewTitle}
        width={800}
      >
        <Spin spinning={loading}>
          <pre className="max-h-[60vh] overflow-auto rounded bg-color-2 p-4 text-sm">
            {previewContent || "暂无内容"}
          </pre>
        </Spin>
      </Modal>
    </>
  );
};

export default FilesContent;
