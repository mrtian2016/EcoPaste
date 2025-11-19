/**
 * 剪贴板列表项组件 - 完全对齐 EcoPaste UI
 */
import "dayjs/locale/zh-cn";
import { Flex, message, Popconfirm } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Marker } from "react-mark.js";
import { useSnapshot } from "valtio";
import Scrollbar from "@/components/Scrollbar";
import UnoIcon from "@/components/UnoIcon";
import {
  useDeleteClipboardItem,
  useToggleFavorite,
} from "@/hooks/useClipboardHistory";
import { authStore } from "@/stores/auth";
import type { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
import { getServerBaseUrl } from "@/utils/api";
import { isImageFile, isTextFile } from "@/utils/file";
import FilesContent from "./components/FilesContent";
import HtmlContent from "./components/HtmlContent";
import ImageContent from "./components/ImageContent";
import RtfContent from "./components/RtfContent";
import TextContent from "./components/TextContent";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

interface ClipboardItemProps {
  item: ClipboardItemType;
  searchText?: string;
}

const ClipboardItem = ({ item, searchText }: ClipboardItemProps) => {
  const deleteMutation = useDeleteClipboardItem();
  const toggleFavoriteMutation = useToggleFavorite();
  const { token } = useSnapshot(authStore);

  // 获取类型文本
  const getTypeText = () => {
    if (item.subtype === "link") return "链接";
    if (item.subtype === "email") return "邮箱";
    if (item.subtype === "color") return "颜色";
    if (item.subtype === "path") return "路径";

    switch (item.type) {
      case "text":
        return "纯文本";
      case "rtf":
        return "RTF";
      case "html":
        return "HTML";
      case "image":
        return "图片";
      case "files": {
        try {
          const jsonStr = item.remote_files || item.value || "[]";
          const files = JSON.parse(jsonStr);

          // 如果只有一个文件，根据类型显示
          if (files.length === 1) {
            const fileName = files[0].original_name || files[0].name;
            if (fileName) {
              if (isImageFile(fileName)) {
                return "图片";
              }
              if (isTextFile(fileName)) {
                return "文本文件";
              }
            }
          }

          // 检查是否全部是图片
          const allImages = files.every((file: any) =>
            isImageFile(file.original_name || file.name),
          );

          if (allImages) {
            return `${files.length} 张图片`;
          }

          return `${files.length || 0} 个文件`;
        } catch {
          return "文件";
        }
      }
      default:
        return item.type;
    }
  };

  // 获取字符数或文件大小
  const getCountText = () => {
    if (item.type === "files" || item.type === "image") {
      // 简化文件大小显示
      const bytes = item.count;
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
    }
    return `${item.count} 个字符`;
  };

  // 渲染内容
  const renderContent = () => {
    switch (item.type) {
      case "text":
        return <TextContent item={item} searchText={searchText} />;
      case "image":
        return <ImageContent item={item} />;
      case "files":
        return <FilesContent item={item} />;
      case "html":
        return <HtmlContent item={item} searchText={searchText} />;
      case "rtf":
        return <RtfContent item={item} searchText={searchText} />;
      default:
        return (
          <div className="line-clamp-4 break-words">
            {searchText ? (
              <Marker mark={searchText}>{item.value}</Marker>
            ) : (
              item.value
            )}
          </div>
        );
    }
  };

  // 切换收藏
  const handleToggleFavorite = () => {
    toggleFavoriteMutation.mutate({
      favorite: item.favorite ? 0 : 1,
      id: item.id,
    });
  };

  // 删除
  const handleDelete = () => {
    deleteMutation.mutate(item.id);
  };

  // 复制 - 兼容移动端
  const handleCopy = async () => {
    try {
      let textToCopy = item.value;

      if (item.type === "html") {
        // HTML 类型复制为纯文本
        const parser = new DOMParser();
        const doc = parser.parseFromString(item.value, "text/html");
        textToCopy = doc.body.textContent || "";
      }

      // 优先使用 Clipboard API
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // 降级方案：使用 textarea 方式（兼容旧浏览器和某些移动端）
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.top = "0";
        textarea.style.left = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          const successful = document.execCommand("copy");
          if (!successful) {
            throw new Error("execCommand failed");
          }
        } finally {
          document.body.removeChild(textarea);
        }
      }

      message.success("复制成功");
    } catch {
      message.error("复制失败");
    }
  };

  // 下载文件
  const handleDownload = async () => {
    try {
      if (item.type === "image") {
        // 下载图片
        let fileId = item.value;
        // 如果是完整路径，提取文件名
        if (fileId.includes("/")) {
          fileId = fileId.split("/").pop() || fileId;
        }

        const downloadUrl = `${getServerBaseUrl()}/api/v1/files/download/${fileId}?token=${token}`;
        const fileName = item.remote_file_name || fileId;

        // 使用 fetch 获取文件并创建 Blob，强制触发下载
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error("下载失败");
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        // 创建隐藏的 a 标签并触发下载
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 释放 Blob URL
        URL.revokeObjectURL(blobUrl);

        message.success("下载成功");
        return;
      }

      // 下载文件列表
      const jsonStr = item.remote_files || item.value || "[]";
      const files = JSON.parse(jsonStr);

      if (files.length === 0) {
        message.error("没有可下载的文件");
        return;
      }

      // 下载所有文件
      for (const file of files) {
        if (file.file_id) {
          const downloadUrl = `${getServerBaseUrl()}/api/v1/files/download/${file.file_id}?token=${token}`;
          const fileName = file.original_name || file.name || "下载文件";

          // 使用 fetch 获取文件并创建 Blob，强制触发下载
          const response = await fetch(downloadUrl);
          if (!response.ok) {
            throw new Error("下载失败");
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          // 创建隐藏的 a 标签并触发下载
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // 释放 Blob URL
          URL.revokeObjectURL(blobUrl);

          // 如果有多个文件，添加一点延迟避免浏览器阻止多文件下载
          if (files.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }

      message.success(
        files.length === 1 ? "下载成功" : `已开始下载 ${files.length} 个文件`,
      );
    } catch {
      message.error("下载失败");
    }
  };

  const operationButtons = [
    {
      icon: "i-hugeicons:copy-01",
      key: "copy",
      onClick: handleCopy,
      show: item.type === "text" || item.type === "html",
      title: "复制",
    },
    {
      icon: "i-hugeicons:download-02",
      key: "download",
      onClick: handleDownload,
      show: item.type === "files" || item.type === "image",
      title: "下载",
    },
    {
      className: item.favorite ? "text-gold!" : "",
      icon: item.favorite ? "i-iconamoon:star-fill" : "i-iconamoon:star",
      key: "favorite",
      onClick: handleToggleFavorite,
      show: true,
      title: item.favorite ? "取消收藏" : "收藏",
    },
    {
      confirm: true,
      icon: "i-hugeicons:delete-02",
      key: "delete",
      onClick: handleDelete,
      show: true,
      title: "删除",
    },
  ];

  return (
    <Flex
      className="group b b-color-2 mx-3 max-h-30 select-none rounded-md p-1.5"
      gap={4}
      vertical
    >
      {/* Header */}
      <Flex className="text-color-2" gap="small" justify="space-between">
        <Scrollbar className="min-w-0 flex-1" thumbSize={0}>
          <Flex className="whitespace-nowrap text-xs" gap="small">
            <span>{getTypeText()}</span>
            <span>{getCountText()}</span>
            {item.width && item.height && (
              <span>
                {item.width}×{item.height}
              </span>
            )}
            <span>{dayjs(item.createTime).fromNow()}</span>
          </Flex>
        </Scrollbar>

        {/* 操作按钮 */}
        <Flex
          align="center"
          className="shrink-0 transition"
          gap={12}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {operationButtons
            .filter((btn) => btn.show)
            .map((button) => {
              if (button.confirm) {
                return (
                  <Popconfirm
                    cancelText="取消"
                    description="删除后无法恢复"
                    key={button.key}
                    okText="删除"
                    onConfirm={button.onClick}
                    title="确认删除"
                  >
                    <div className="cursor-pointer p-2">
                      <UnoIcon
                        className={button.className}
                        hoverable
                        name={button.icon}
                        size={22}
                        title={button.title}
                      />
                    </div>
                  </Popconfirm>
                );
              }

              return (
                <div
                  className="cursor-pointer p-2"
                  key={button.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    button.onClick();
                  }}
                >
                  <UnoIcon
                    className={button.className}
                    hoverable
                    name={button.icon}
                    size={22}
                    title={button.title}
                  />
                </div>
              );
            })}
        </Flex>
      </Flex>

      {/* Content */}
      <div className="relative flex-1 select-auto overflow-hidden break-words">
        {item.note ? (
          <div className="pointer-events-none line-clamp-4">
            <UnoIcon
              className="mr-0.5 inline translate-y-0.5"
              name="i-hugeicons:task-edit-01"
            />
            <Marker mark={searchText}>{item.note}</Marker>
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </Flex>
  );
};

export default ClipboardItem;
