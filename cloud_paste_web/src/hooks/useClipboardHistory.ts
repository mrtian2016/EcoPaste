/**
 * 剪贴板历史 React Query Hooks
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { clipboardApi } from "@/api/endpoints/clipboard";
import type { ClipboardListParams } from "@/types/clipboard";

export const CLIPBOARD_QUERY_KEY = "clipboard-history";

/**
 * 获取剪贴板历史列表
 */
export const useClipboardHistory = (params: ClipboardListParams = {}) => {
  return useQuery({
    queryFn: () => clipboardApi.getList(params),
    queryKey: [CLIPBOARD_QUERY_KEY, params],
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
  });
};

/**
 * 获取单个剪贴板项
 */
export const useClipboardItem = (id: string) => {
  return useQuery({
    enabled: !!id,
    queryFn: () => clipboardApi.getItem(id),
    queryKey: [CLIPBOARD_QUERY_KEY, id],
  });
};

/**
 * 删除剪贴板项
 */
export const useDeleteClipboardItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clipboardApi.deleteItem,
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || "删除失败");
    },
    onSuccess: () => {
      // 刷新列表
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
      message.success("删除成功");
    },
  });
};

/**
 * 批量删除剪贴板项
 */
export const useBatchDeleteClipboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clipboardApi.batchDelete,
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || "批量删除失败");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
      message.success("批量删除成功");
    },
  });
};

/**
 * 切换收藏状态
 */
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: number }) =>
      clipboardApi.toggleFavorite(id, favorite),
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || "操作失败");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
    },
  });
};

/**
 * 更新备注
 */
export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      clipboardApi.updateNote(id, note),
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || "更新失败");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIPBOARD_QUERY_KEY] });
      message.success("备注更新成功");
    },
  });
};
