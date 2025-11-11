/**
 * 可拖动的悬浮按钮组件
 */
import type { FC, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

// 配置常量
const BUTTON_SIZE = 40; // 按钮尺寸
const EDGE_MARGIN_BOTTOM = 10; // 底部边距
const EDGE_MARGIN_RIGHT = 5; // 右侧边距

interface DraggableFloatButtonProps {
  icon: ReactNode;
  onClick?: () => void;
}

const DraggableFloatButton: FC<DraggableFloatButtonProps> = ({
  icon,
  onClick,
}) => {
  const [position, setPosition] = useState({
    bottom: EDGE_MARGIN_BOTTOM,
    right: EDGE_MARGIN_RIGHT,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonStartPos = useRef({
    bottom: EDGE_MARGIN_BOTTOM,
    right: EDGE_MARGIN_RIGHT,
  });

  // 处理鼠标按下
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只响应左键
    if (e.button !== 0) return;

    setIsDragging(true);
    setHasMoved(false);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    buttonStartPos.current = position;

    e.stopPropagation();
  };

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setHasMoved(false);
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    buttonStartPos.current = position;

    e.stopPropagation();
  };

  // 处理点击
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 只有没有移动时才触发点击
    if (!hasMoved) {
      onClick?.();
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      // 如果移动超过 5px，认为是拖动
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        setHasMoved(true);
      }

      // 计算新位置
      const newRight = Math.max(
        EDGE_MARGIN_RIGHT,
        Math.min(
          window.innerWidth - BUTTON_SIZE - EDGE_MARGIN_RIGHT,
          buttonStartPos.current.right - deltaX,
        ),
      );
      const newBottom = Math.max(
        EDGE_MARGIN_BOTTOM,
        Math.min(
          window.innerHeight - BUTTON_SIZE - EDGE_MARGIN_BOTTOM,
          buttonStartPos.current.bottom - deltaY,
        ),
      );

      setPosition({ bottom: newBottom, right: newRight });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartPos.current.x;
      const deltaY = touch.clientY - dragStartPos.current.y;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        setHasMoved(true);
      }

      const newRight = Math.max(
        EDGE_MARGIN_RIGHT,
        Math.min(
          window.innerWidth - BUTTON_SIZE - EDGE_MARGIN_RIGHT,
          buttonStartPos.current.right - deltaX,
        ),
      );
      const newBottom = Math.max(
        EDGE_MARGIN_BOTTOM,
        Math.min(
          window.innerHeight - BUTTON_SIZE - EDGE_MARGIN_BOTTOM,
          buttonStartPos.current.bottom - deltaY,
        ),
      );

      setPosition({ bottom: newBottom, right: newRight });
    };

    const handleMouseUp = () => {
      setIsDragging(false);

      // 自动贴边：判断按钮更靠近左边还是右边
      setPosition((currentPos) => {
        const buttonLeft = window.innerWidth - currentPos.right - BUTTON_SIZE;
        const isCloserToLeft = buttonLeft < window.innerWidth / 2;

        return {
          bottom: currentPos.bottom,
          right: isCloserToLeft
            ? window.innerWidth - BUTTON_SIZE - EDGE_MARGIN_RIGHT
            : EDGE_MARGIN_RIGHT,
        };
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  const button = (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.25)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
        }
      }}
      onTouchStart={handleTouchStart}
      style={{
        alignItems: "center",
        backgroundColor: "#1677ff",
        border: "none",
        borderRadius: "50%",
        bottom: position.bottom,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        color: "white",
        cursor: isDragging ? "grabbing" : "pointer",
        display: "flex",
        fontSize: "18px",
        height: BUTTON_SIZE,
        justifyContent: "center",
        position: "fixed",
        right: position.right,
        transition: isDragging ? "none" : "all 0.3s",
        userSelect: "none",
        width: BUTTON_SIZE,
        zIndex: 1000,
      }}
      type="button"
    >
      {icon}
    </button>
  );

  return button;
};

export default DraggableFloatButton;
