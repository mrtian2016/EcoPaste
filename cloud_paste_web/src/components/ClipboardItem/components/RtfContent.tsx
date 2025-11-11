/**
 * RTF 内容渲染组件
 */
import type { FC } from "react";
import { Marker } from "react-mark.js";
import type { ClipboardItem } from "@/types/clipboard";

interface RtfContentProps {
  item: ClipboardItem;
  searchText?: string;
}

const RtfContent: FC<RtfContentProps> = ({ item, searchText }) => {
  const { value } = item;

  // 简化 RTF 渲染：提取文本内容
  // 完整的 RTF 渲染需要 rtf.js 库，这里先简化处理
  // TODO: 如果需要完整的 RTF 渲染，可以参考桌面端使用 rtf.js
  const textContent = value
    .replace(/\\[a-z]+\d*\s?/gi, "")
    .replace(/[{}]/g, "");

  return (
    <div className="line-clamp-4 break-words">
      {searchText ? (
        <Marker mark={searchText}>{textContent}</Marker>
      ) : (
        <span>{textContent}</span>
      )}
    </div>
  );
};

export default RtfContent;
