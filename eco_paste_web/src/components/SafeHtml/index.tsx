/**
 * 安全的 HTML 渲染组件
 */
import DOMPurify from "dompurify";
import type { FC, MouseEvent } from "react";
import { Marker } from "react-mark.js";

interface SafeHtmlProps {
  value: string;
  searchText?: string;
}

const SafeHtml: FC<SafeHtmlProps> = ({ value, searchText }) => {
  const handleClick = (event: MouseEvent) => {
    const { target, metaKey, ctrlKey } = event;

    const link = (target as HTMLElement).closest("a");

    if (!link || metaKey || ctrlKey) return;

    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <Marker mark={searchText}>
      <div
        className="translate-z-0 line-clamp-4"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(value, {
            FORBID_ATTR: ["target", "controls", "autoplay", "autoPlay"],
          }),
        }}
        onClick={handleClick}
      />
    </Marker>
  );
};

export default SafeHtml;
