/**
 * 剪贴板列表项组件 - 完全对齐 EcoPaste UI
 */
import { Flex, Popconfirm } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { Marker } from "react-mark.js";
import Scrollbar from "@/components/Scrollbar";
import UnoIcon from "@/components/UnoIcon";
import {
  useDeleteClipboardItem,
  useToggleFavorite,
} from "@/hooks/useClipboardHistory";
import type { ClipboardItem as ClipboardItemType } from "@/types/clipboard";

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
      case "files":
        return `${JSON.parse(item.value || "[]").length || 0} 个文件`;
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
    if (item.type === "image") {
      return item.remote_file_url ? (
        <img
          alt="clipboard"
          className="max-h-40 max-w-full rounded object-contain"
          src={`${import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") || ""}${item.remote_file_url}`}
        />
      ) : (
        <span className="text-color-2">图片</span>
      );
    }

    if (item.type === "files") {
      return <span className="text-color-2">文件列表</span>;
    }

    // 文本内容，支持搜索高亮
    return (
      <div className="line-clamp-4 break-words">
        {searchText ? (
          <Marker mark={searchText}>{item.value}</Marker>
        ) : (
          item.value
        )}
      </div>
    );
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
      icon: item.favorite ? "i-hugeicons:star" : "i-hugeicons:star-off",
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
          <>
            <div className="pointer-events-none line-clamp-4">
              <UnoIcon
                className="mr-0.5 inline translate-y-0.5"
                name="i-hugeicons:task-edit-01"
              />
              <Marker mark={searchText}>{item.note}</Marker>
            </div>
          </>
        ) : (
          renderContent()
        )}
      </div>
    </Flex>
  );
};

export default ClipboardItem;
