/**
 * 文本内容渲染组件
 */
import { Flex } from "antd";
import clsx from "clsx";
import type { CSSProperties, FC } from "react";
import { Marker } from "react-mark.js";
import type { ClipboardItem } from "@/types/clipboard";

interface TextContentProps {
  item: ClipboardItem;
  searchText?: string;
}

const TextContent: FC<TextContentProps> = ({ item, searchText }) => {
  const { value, subtype } = item;

  const renderMarker = () => {
    return searchText ? (
      <Marker mark={searchText}>{value}</Marker>
    ) : (
      <span>{value}</span>
    );
  };

  const renderColor = () => {
    const className = "absolute rounded-full";
    const style: CSSProperties = {
      background: value,
    };

    return (
      <Flex align="center" gap="small">
        <div className="relative h-5.5 min-w-5.5">
          <span
            className={clsx(className, "inset-0 opacity-50")}
            style={style}
          />
          <span className={clsx(className, "inset-0.5")} style={style} />
        </div>
        {renderMarker()}
      </Flex>
    );
  };

  if (subtype === "color") {
    return <div className="line-clamp-4">{renderColor()}</div>;
  }

  return <div className="line-clamp-4 break-words">{renderMarker()}</div>;
};

export default TextContent;
