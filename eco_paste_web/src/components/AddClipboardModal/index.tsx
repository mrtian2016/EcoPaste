/**
 * 新增剪贴板记录对话框
 */

import type { UploadFile } from "antd";
import { Button, Flex, Input, Modal, message, Segmented, Upload } from "antd";
import { nanoid } from "nanoid";
import { type FC, useState } from "react";
import { filesApi } from "@/api/endpoints/files";
import { syncManager } from "@/api/syncManager";
import UnoIcon from "@/components/UnoIcon";
import type { ClipboardItem } from "@/types/clipboard";

const { TextArea } = Input;

interface AddClipboardModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ContentType = "text" | "image" | "file";

const AddClipboardModal: FC<AddClipboardModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [contentType, setContentType] = useState<ContentType>("text");
  const [textValue, setTextValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 重置表单
  const resetForm = () => {
    setContentType("text");
    setTextValue("");
    setFileList([]);
  };

  // 处理关闭
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 提交文本类型
  const handleSubmitText = async () => {
    if (!textValue.trim()) {
      message.warning("请输入文本内容");
      return;
    }

    try {
      setUploading(true);

      const clipboardItem: ClipboardItem = {
        count: textValue.length,
        createTime: new Date().toISOString(),
        favorite: 0,
        id: nanoid(),
        search: textValue,
        type: "text",
        value: textValue,
      };

      // 通过 WebSocket 同步到后端
      await syncManager.syncClipboard(clipboardItem);

      message.success("添加成功");
      handleClose();
      onSuccess?.();
    } catch (error) {
      message.error(
        `添加失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    } finally {
      setUploading(false);
    }
  };

  // 提交图片类型
  const handleSubmitImage = async () => {
    if (fileList.length === 0) {
      message.warning("请选择图片");
      return;
    }

    try {
      setUploading(true);

      const file = fileList[0].originFileObj;
      if (!file) {
        throw new Error("文件不存在");
      }

      // 上传图片
      const response = await filesApi.upload(file);

      const clipboardItem: ClipboardItem = {
        count: response.data.file_size, // 文件大小
        createTime: new Date().toISOString(),
        favorite: 0,
        id: nanoid(),
        remote_file_id: response.data.file_id,
        remote_file_name: response.data.file_name,
        remote_file_url: response.data.file_url,
        search: response.data.file_name,
        type: "image",
        value: response.data.file_name, // 使用文件名而非 URL
      };

      // 通过 WebSocket 同步到后端
      await syncManager.syncClipboard(clipboardItem);

      message.success("添加成功");
      handleClose();
      onSuccess?.();
    } catch (error) {
      message.error(
        `添加失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    } finally {
      setUploading(false);
    }
  };

  // 提交文件类型
  const handleSubmitFile = async () => {
    if (fileList.length === 0) {
      message.warning("请选择文件");
      return;
    }

    try {
      setUploading(true);

      // 上传所有文件
      const uploadPromises = fileList.map((f) => {
        if (!f.originFileObj) {
          throw new Error("文件不存在");
        }
        return filesApi.upload(f.originFileObj);
      });

      const responses = await Promise.all(uploadPromises);

      // 构建文件列表
      const remoteFiles = responses.map((res) => ({
        file_id: res.data.file_id,
        file_size: res.data.file_size,
        file_url: res.data.file_url,
        mime_type: res.data.mime_type,
        original_name: res.data.file_name, // 使用 original_name 字段名
      }));

      const clipboardItem: ClipboardItem = {
        count: remoteFiles.reduce((sum, f) => sum + (f.file_size || 0), 0), // 总文件大小
        createTime: new Date().toISOString(),
        favorite: 0,
        id: nanoid(),
        remote_files: JSON.stringify(remoteFiles),
        search: remoteFiles.map((f) => f.original_name).join(" "),
        type: "files",
        value: remoteFiles.map((f) => f.original_name).join(", "),
      };

      // 通过 WebSocket 同步到后端
      await syncManager.syncClipboard(clipboardItem);

      message.success("添加成功");
      handleClose();
      onSuccess?.();
    } catch (error) {
      message.error(
        `添加失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    } finally {
      setUploading(false);
    }
  };

  // 提交表单
  const handleSubmit = () => {
    if (contentType === "text") {
      handleSubmitText();
    } else if (contentType === "image") {
      handleSubmitImage();
    } else {
      handleSubmitFile();
    }
  };

  return (
    <Modal
      footer={
        <Flex gap="small" justify="flex-end">
          <Button onClick={handleClose}>取消</Button>
          <Button loading={uploading} onClick={handleSubmit} type="primary">
            确定
          </Button>
        </Flex>
      }
      onCancel={handleClose}
      open={open}
      title="新增剪贴板记录"
      width={600}
    >
      <Flex gap="middle" vertical>
        {/* 类型选择 */}
        <div>
          <Segmented
            block
            onChange={(value) => setContentType(value as ContentType)}
            options={[
              {
                label: (
                  <Flex align="center" gap="small">
                    <UnoIcon name="i-lucide:text" />
                    <span>文本</span>
                  </Flex>
                ),
                value: "text",
              },
              {
                label: (
                  <Flex align="center" gap="small">
                    <UnoIcon name="i-lucide:image" />
                    <span>图片</span>
                  </Flex>
                ),
                value: "image",
              },
              {
                label: (
                  <Flex align="center" gap="small">
                    <UnoIcon name="i-lucide:file" />
                    <span>文件</span>
                  </Flex>
                ),
                value: "file",
              },
            ]}
            value={contentType}
          />
        </div>

        {/* 内容输入 */}
        <div>
          <div className="mb-2 text-color-2 text-sm">内容</div>
          {contentType === "text" && (
            <TextArea
              className="mb-4"
              maxLength={10000}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="请输入文本内容..."
              rows={8}
              showCount
              value={textValue}
            />
          )}

          {contentType === "image" && (
            <Upload.Dragger
              accept="image/*"
              beforeUpload={() => false}
              fileList={fileList}
              listType="picture"
              maxCount={1}
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
            >
              <p className="ant-upload-drag-icon">
                <UnoIcon
                  className="text-4xl text-primary"
                  name="i-lucide:image-up"
                />
              </p>
              <p className="ant-upload-text">点击或拖拽图片到此处上传</p>
              <p className="ant-upload-hint">支持 JPG、PNG、GIF 等图片格式</p>
            </Upload.Dragger>
          )}

          {contentType === "file" && (
            <Upload.Dragger
              beforeUpload={() => false}
              fileList={fileList}
              listType="picture"
              multiple
              onChange={({ fileList: newFileList }) => setFileList(newFileList)}
            >
              <p className="ant-upload-drag-icon">
                <UnoIcon
                  className="text-4xl text-primary"
                  name="i-lucide:file-up"
                />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
              <p className="ant-upload-hint">支持上传多个文件，任意格式</p>
            </Upload.Dragger>
          )}
        </div>
      </Flex>
    </Modal>
  );
};

export default AddClipboardModal;
