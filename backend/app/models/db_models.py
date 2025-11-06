"""
SQLAlchemy 数据库模型定义（对齐前端 Schema）
"""
from typing import Optional
from sqlalchemy import String, Text, Integer, Index, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """ORM 模型基类"""
    pass


class User(Base):
    """用户模型（保持不变，使用 DateTime）"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="用户名")
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, comment="邮箱")
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False, comment="密码哈希")
    full_name: Mapped[Optional[str]] = mapped_column(String(100), comment="全名")
    is_active: Mapped[int] = mapped_column(Integer, default=1, nullable=False, comment="是否激活 0/1")
    is_superuser: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="是否超级用户 0/1")
    max_history_items: Mapped[int] = mapped_column(Integer, default=1000, nullable=False, comment="历史数据最大保留条数")
    created_at: Mapped[str] = mapped_column(String(50), nullable=False,server_default=func.now(),comment="创建时间 ISO 8601")
    updated_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=False,server_default=func.now(), comment="更新时间 ISO 8601")
    last_login: Mapped[Optional[str]] = mapped_column(String(50), comment="最后登录时间 ISO 8601")

    __table_args__ = (
        Index('idx_username', 'username'),
        Index('idx_email', 'email'),
    )


class ClipboardHistory(Base):
    """剪贴板历史记录模型（完全对齐前端 Schema）"""
    __tablename__ = "clipboard_history"

    # ===== 前端原有字段（字段名和类型完全一致）=====
    id: Mapped[str] = mapped_column(String(21), primary_key=True, comment="nanoid ID（前端生成）")
    type: Mapped[str] = mapped_column(String(50), nullable=False, comment="text/html/rtf/image/files")
    group: Mapped[Optional[str]] = mapped_column(String(50), name="group", comment="text/image/files/favorite/all")
    value: Mapped[str] = mapped_column(Text, nullable=False, comment="内容或文件路径/file_id")
    search: Mapped[Optional[str]] = mapped_column(Text, comment="搜索索引")
    count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="使用次数")
    width: Mapped[Optional[int]] = mapped_column(Integer, comment="图片宽度")
    height: Mapped[Optional[int]] = mapped_column(Integer, comment="图片高度")
    favorite: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="是否收藏 0/1")
    createTime: Mapped[str] = mapped_column(String(50), nullable=False, comment="创建时间 ISO 8601")
    note: Mapped[Optional[str]] = mapped_column(Text, comment="用户备注")
    subtype: Mapped[Optional[str]] = mapped_column(String(50), comment="子类型: url/email/color/path")

    # ===== 后端必需字段 =====
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        comment="用户ID"
    )
    device_id: Mapped[Optional[str]] = mapped_column(String(100), comment="来源设备ID")
    device_name: Mapped[Optional[str]] = mapped_column(String(100), comment="设备名称")

    # ===== 同步辅助字段 =====
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), comment="内容哈希 SHA256")
    synced: Mapped[int] = mapped_column(Integer, default=1, nullable=False, comment="是否已同步 0/1")
    updated_at: Mapped[Optional[str]] = mapped_column(String(50), comment="最后更新时间 ISO 8601")

    # 索引
    __table_args__ = (
        Index('idx_user_time', 'user_id', 'createTime'),
        Index('idx_user_hash', 'user_id', 'content_hash'),
        Index('idx_favorite', 'user_id', 'favorite'),
        Index('idx_device', 'device_id'),
        Index('idx_synced', 'synced'),
    )

    def __repr__(self) -> str:
        return f"<ClipboardHistory(id={self.id}, type={self.type}, createTime={self.createTime})>"


class Device(Base):
    """设备信息模型"""
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    device_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, comment="设备唯一标识")
    device_name: Mapped[str] = mapped_column(String(100), nullable=False, comment="设备名称")
    device_type: Mapped[Optional[str]] = mapped_column(String(50), comment="设备类型")
    last_online: Mapped[Optional[str]] = mapped_column(String(50), comment="最后在线时间 ISO 8601")
    last_sync_time: Mapped[Optional[str]] = mapped_column(String(50), comment="最后同步时间 ISO 8601")
    created_at: Mapped[str] = mapped_column(String(50), nullable=False, comment="创建时间 ISO 8601")

    def __repr__(self) -> str:
        return f"<Device(id={self.id}, device_id='{self.device_id}', device_name='{self.device_name}')>"
