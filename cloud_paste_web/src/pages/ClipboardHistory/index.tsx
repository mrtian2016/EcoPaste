/**
 * 剪贴板历史列表页面 - 完全对齐 EcoPaste UI
 */

import { useDebounce } from "ahooks";
import { Empty, Flex, Input, Spin, Tag } from "antd";
import clsx from "clsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AddClipboardModal from "@/components/AddClipboardModal";
import ClipboardItem from "@/components/ClipboardItem";
import DraggableFloatButton from "@/components/DraggableFloatButton";
import Scrollbar from "@/components/Scrollbar";
import UnoIcon from "@/components/UnoIcon";
import { useClipboardHistory } from "@/hooks/useClipboardHistory";
import { logout } from "@/stores/auth";
import type { ClipboardListParams } from "@/types/clipboard";

type GroupType = "all" | "text" | "image" | "files" | "favorite";

const ClipboardHistory = () => {
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupType>("all");
  const [searchText, setSearchText] = useState("");
  const [activeId, setActiveId] = useState<string>();
  const [showAddModal, setShowAddModal] = useState(false);

  const [params, setParams] = useState<ClipboardListParams>({
    favorite: undefined,
    page: 1,
    page_size: 50,
    search: undefined,
  });

  // 使用 ahooks 的 useDebounce 进行防抖
  const debouncedParams = useDebounce(params, { wait: 300 });

  // 查询数据
  const { data, isLoading } = useClipboardHistory(debouncedParams);

  // 搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setParams({ ...params, page: 1, search: value || undefined });
  };

  // 切换分组
  const handleGroupChange = (newGroup: GroupType) => {
    setGroup(newGroup);

    if (newGroup === "favorite") {
      setParams({ ...params, favorite: true, page: 1, type: undefined });
    } else if (newGroup === "all") {
      setParams({ ...params, favorite: undefined, page: 1, type: undefined });
    } else {
      // 根据分组类型设置 type 参数
      setParams({ ...params, favorite: undefined, page: 1, type: newGroup });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const groups = [
    { id: "all" as GroupType, name: "全部" },
    { id: "text" as GroupType, name: "文本" },
    { id: "image" as GroupType, name: "图片" },
    { id: "files" as GroupType, name: "文件" },
    { id: "favorite" as GroupType, name: "收藏" },
  ];

  return (
    <>
      <div className="h-[100dvh] overflow-hidden bg-color-2">
        <Flex
          className="mx-auto h-[100dvh] max-w-2xl bg-color-1 py-3 shadow-lg md:h-[calc(100vh-3rem)] md:rounded-lg"
          gap={12}
          vertical
        >
          {/* 搜索框 */}
          <div className="mx-3">
            <Input
              allowClear
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索剪贴板内容..."
              prefix={<UnoIcon name="i-lucide:search" />}
              size="large"
              value={searchText}
            />
          </div>

          {/* 分组标签和设置按钮 */}
          <Flex className="flex-1 overflow-hidden" gap={12} vertical>
            <Flex
              align="center"
              className="overflow-hidden px-3"
              gap="small"
              justify="space-between"
            >
              {/* 分组标签 */}
              <Scrollbar className="flex">
                {groups.map((item) => {
                  const isChecked = item.id === group;
                  return (
                    <div id={item.id} key={item.id}>
                      <Tag.CheckableTag
                        checked={isChecked}
                        className={clsx({ "bg-primary!": isChecked })}
                        onChange={() => handleGroupChange(item.id)}
                      >
                        {item.name}
                      </Tag.CheckableTag>
                    </div>
                  );
                })}
              </Scrollbar>

              {/* 设置和登出按钮 */}
              <Flex align="center" className="text-color-2 text-lg" gap={4}>
                <UnoIcon
                  hoverable
                  name="i-lets-icons:setting-alt-line"
                  onClick={() => navigate("/")}
                />
                <UnoIcon
                  hoverable
                  name="i-hugeicons:logout-03"
                  onClick={handleLogout}
                />
              </Flex>
            </Flex>

            {/* 列表内容 */}
            <Scrollbar className="flex-1" offsetX={3}>
              <Spin spinning={isLoading}>
                {data?.items && data.items.length > 0 ? (
                  <div className="pb-20">
                    {data.items.map((item, index) => (
                      <div className={index !== 0 ? "pt-3" : ""} key={item.id}>
                        <ClipboardItem
                          isActive={activeId === item.id}
                          item={item}
                          onClick={() => setActiveId(item.id)}
                          searchText={searchText}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    description="暂无剪贴板历史"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Spin>
            </Scrollbar>
          </Flex>
        </Flex>
      </div>

      {/* 悬浮按钮 - 新增剪贴板记录 */}
      <DraggableFloatButton
        icon={<UnoIcon name="i-lucide:plus" />}
        onClick={() => setShowAddModal(true)}
      />

      {/* 新增剪贴板记录对话框 */}
      <AddClipboardModal
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          // 刷新列表
          setParams({ ...params });
        }}
        open={showAddModal}
      />
    </>
  );
};

export default ClipboardHistory;
