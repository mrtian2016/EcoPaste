/**
 * 剪贴板列表项组件 - 完全对齐 EcoPaste UI
 */
import "dayjs/locale/zh-cn";
import { Flex, Popconfirm } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Marker } from "react-mark.js";
import Scrollbar from "@/components/Scrollbar";
import UnoIcon from "@/components/UnoIcon";
import {
  useDeleteClipboardItem,
  useToggleFavorite,
} from "@/hooks/useClipboardHistory";
import type { ClipboardItem as ClipboardItemType } from "@/types/clipboard";
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
  isActive?: boolean;
  onClick?: () => void;
}

const ClipboardItem = ({
  item,
  searchText,
  isActive,
  onClick,
}: ClipboardItemProps) => {
  const deleteMutation = useDeleteClipboardItem();
  const toggleFavoriteMutation = useToggleFavorite();

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

  // 复制
  const handleCopy = () => {
    navigator.clipboard.writeText(item.value);
  };

  const operationButtons = [
    {
      icon: "i-hugeicons:copy-01",
      key: "copy",
      onClick: handleCopy,
      show: item.type === "text",
      title: "复制",
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
      className={clsx(
        "group b hover:b-primary-5 b-color-2 mx-3 max-h-30 rounded-md p-1.5 transition",
        {
          "b-primary bg-primary-1": isActive,
        },
      )}
      gap={4}
      onClick={onClick}
      vertical
    >
      {/* Header */}
      <Flex className="text-color-2" gap="small" justify="space-between">
        <Scrollbar thumbSize={0}>
          <Flex className="flex-1 whitespace-nowrap text-xs" gap="small">
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
          className={clsx("opacity-0 transition group-hover:opacity-100", {
            "opacity-100": isActive,
          })}
          gap={6}
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
                    <UnoIcon
                      className={button.className}
                      hoverable
                      name={button.icon}
                      title={button.title}
                    />
                  </Popconfirm>
                );
              }

              return (
                <UnoIcon
                  className={button.className}
                  hoverable
                  key={button.key}
                  name={button.icon}
                  onClick={button.onClick}
                  title={button.title}
                />
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
