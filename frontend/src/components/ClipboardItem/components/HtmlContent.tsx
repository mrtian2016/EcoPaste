/**
 * HTML 内容渲染组件
 */
import type { FC } from "react";
import SafeHtml from "@/components/SafeHtml";
import type { ClipboardItem } from "@/types/clipboard";

interface HtmlContentProps {
  item: ClipboardItem;
  searchText?: string;
}

const HtmlContent: FC<HtmlContentProps> = ({ item, searchText }) => {
  const { value } = item;

  return <SafeHtml searchText={searchText} value={value} />;
};

export default HtmlContent;
