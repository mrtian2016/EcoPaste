"""
Pydantic 数据模型定义（对齐前端 Schema）
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_serializer
from typing import Optional
from datetime import datetime, timezone, timedelta


# ==================== 用户相关模型 ====================

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[int] = None


class User(UserBase):
    id: int
    is_active: int = 1
    is_superuser: int = 0
    max_history_items: int = 1000
    created_at: str
    last_login: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('created_at', 'last_login')
    def format_datetime(self, value: Optional[str]) -> Optional[str]:
        """格式化时间字段为 YYYY-MM-DD HH:MM:SS 格式（UTC+8）"""
        if not value:
            return value
        try:
            # 尝试解析 ISO 8601 格式
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
            # 转换为 UTC+8 时区
            dt_utc8 = dt.astimezone(timezone(timedelta(hours=8)))
            # 格式化为指定格式
            return dt_utc8.strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            # 如果解析失败，返回原值
            return value


class UserInDB(User):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ==================== 剪贴板相关模型（完全对齐前端）====================

class ClipboardItemBase(BaseModel):
    """剪贴板基础模型（对齐前端字段名）"""
    id: str = Field(..., min_length=21, max_length=21, description="nanoid ID")
    type: str = Field(..., description="text/html/rtf/image/files")
    group: Optional[str] = None
    value: str = Field(..., description="内容或文件路径/file_id")
    search: Optional[str] = None
    count: int = 0
    width: Optional[int] = None
    height: Optional[int] = None
    favorite: int = Field(default=0, description="0/1")
    createTime: str = Field(..., description="ISO 8601")
    note: Optional[str] = None
    subtype: Optional[str] = None
    device_id: Optional[str] = None
    device_name: Optional[str] = None


class ClipboardItemCreate(ClipboardItemBase):
    """创建剪贴板项（前端传来的完整数据）"""
    pass


class ClipboardItemUpdate(BaseModel):
    """更新剪贴板项（部分字段）"""
    id: str
    updates: dict  # 要更新的字段


class ClipboardItem(ClipboardItemBase):
    """剪贴板完整模型"""
    user_id: int
    content_hash: Optional[str] = None
    synced: int = 1
    updated_at: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('createTime', 'updated_at')
    def format_datetime(self, value: Optional[str]) -> Optional[str]:
        """格式化时间字段为 YYYY-MM-DD HH:MM:SS 格式（UTC+8）"""
        if not value:
            return value
        try:
            # 尝试解析 ISO 8601 格式
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
            # 转换为 UTC+8 时区
            dt_utc8 = dt.astimezone(timezone(timedelta(hours=8)))
            # 格式化为指定格式
            return dt_utc8.strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            # 如果解析失败，返回原值
            return value


class DeviceBase(BaseModel):
    device_id: str
    device_name: str
    device_type: Optional[str] = None


class DeviceCreate(DeviceBase):
    pass


class Device(DeviceBase):
    id: int
    user_id: int
    last_online: Optional[str] = None
    created_at: str
    model_config = ConfigDict(from_attributes=True)
    
    @field_serializer('created_at', 'last_online')
    def format_datetime(self, value: Optional[str]) -> Optional[str]:
        """格式化时间字段为 YYYY-MM-DD HH:MM:SS 格式（UTC+8）"""
        if not value:
            return value
        try:
            # 尝试解析 ISO 8601 格式
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
            # 转换为 UTC+8 时区
            dt_utc8 = dt.astimezone(timezone(timedelta(hours=8)))
            # 格式化为指定格式
            return dt_utc8.strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            # 如果解析失败，返回原值
            return value


# ==================== WebSocket 消息模型 ====================

class WSMessage(BaseModel):
    """客户端消息"""
    action: str
    message_id: Optional[str] = None
    data: dict


class WSResponse(BaseModel):
    """服务器响应"""
    type: str
    message_id: Optional[str] = None
    source_device_id: Optional[str] = None
    timestamp: Optional[str] = None
    data: dict


class FetchHistoryRequest(BaseModel):
    """获取历史记录请求"""
    since: Optional[str] = None
    limit: int = 100
    offset: int = 0


class HistoryDataResponse(BaseModel):
    """历史记录响应"""
    total: int
    has_more: bool
    items: list[dict]


class ClipboardListResponse(BaseModel):
    """剪贴板列表响应"""
    total: int
    page: int
    page_size: int
    items: list[ClipboardItem]


class ApiResponse(BaseModel):
    """通用API响应"""
    success: bool
    message: str
    data: Optional[dict] = None


# ==================== 用户设置相关模型 ====================

class UserSettings(BaseModel):
    """用户设置"""
    max_history_items: int = 1000


class UserSettingsUpdate(BaseModel):
    """更新用户设置"""
    max_history_items: Optional[int] = None
