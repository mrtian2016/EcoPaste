"""
剪贴板相关API路由 (SQLAlchemy 版本)
"""
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Optional
from sqlalchemy import select, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from pathlib import Path
import random
import string
from nanoid import generate

from app.api.deps import get_db
from app.models.db_models import ClipboardHistory, User as DBUser, Device
from app.models.schemas import (
    ClipboardItem,
    ClipboardItemCreate,
    ClipboardItemUpdate,
    ClipboardListResponse,
    ApiResponse
)
from app.core.security import get_current_active_user
from app.core.websocket import manager
from app.config import settings

router = APIRouter()

# 文件存储目录
UPLOAD_DIR = Path(settings.UPLOAD_DIR)


def delete_file_if_exists(file_id: str) -> bool:
    """
    删除文件（如果存在）

    Args:
        file_id: 文件ID（文件名）

    Returns:
        是否成功删除
    """
    try:
        file_path = UPLOAD_DIR / file_id
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            logger.info(f"文件删除成功: {file_id}")
            return True
        return False
    except Exception as e:
        logger.warning(f"删除文件失败: {file_id}, 错误: {e}")
        return False


def format_datetime_str(value: str) -> str:
    """格式化时间字符串为 YYYY-MM-DD HH:MM:SS 格式（UTC+8）"""
    if not value:
        return value
    try:
        # 尝试解析 ISO 8601 格式
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        # 转换为 UTC+8 时区
        from datetime import timezone, timedelta
        dt_utc8 = dt.astimezone(timezone(timedelta(hours=8)))
        # 格式化为指定格式
        return dt_utc8.strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        # 如果解析失败，返回原值
        return value


def calculate_content_hash(item_type: str, value: str) -> str:
    """
    计算内容哈希
    - 对于图片和文件类型：使用文件内容计算哈希
    - 对于文本类型：使用文本内容计算哈希
    """
    # 对于图片类型，读取文件内容计算哈希
    if item_type == "image":
        try:
            file_path = UPLOAD_DIR / value
            if file_path.exists():
                with open(file_path, "rb") as f:
                    file_content = f.read()
                    return hashlib.sha256(file_content).hexdigest()
            else:
                logger.warning(f"图片文件不存在，使用文件名计算哈希: {value}")
        except Exception as e:
            logger.error(f"读取图片文件失败，使用文件名计算哈希: {e}")

    # 对于文件列表类型，计算所有文件内容的联合哈希
    if item_type == "files":
        try:
            import json
            remote_files = json.loads(value)
            file_hashes = []

            for file_info in remote_files:
                file_id = file_info.get("file_id")
                if file_id:
                    file_path = UPLOAD_DIR / file_id
                    if file_path.exists():
                        with open(file_path, "rb") as f:
                            file_content = f.read()
                            file_hash = hashlib.sha256(file_content).hexdigest()
                            file_hashes.append(file_hash)

            if file_hashes:
                # 将所有文件哈希组合后再次哈希
                combined_hash = ":".join(file_hashes)
                return hashlib.sha256(combined_hash.encode('utf-8')).hexdigest()
        except Exception as e:
            logger.error(f"计算文件列表哈希失败，使用值计算哈希: {e}")

    # 对于文本类型，使用文本内容计算哈希
    return hashlib.sha256(f"{item_type}:{value}".encode('utf-8')).hexdigest()


@router.post("/", response_model=ClipboardItem, summary="添加剪贴板项")
async def create_clipboard_item(
    item: ClipboardItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user),
    remote_file_name: Optional[str] = Body(None, description="原始文件名（用于图片和文件类型）")
):
    """添加新的剪贴板历史记录（需要认证，支持去重）"""
    try:
        # 计算内容哈希（用于去重）
        content_hash = calculate_content_hash(item.type, item.value)

        # 检查是否存在相同内容（基于 hash）
        result = await db.execute(
            select(ClipboardHistory)
            .where(
                ClipboardHistory.user_id == current_user.id,
                ClipboardHistory.content_hash == content_hash
            )
            .order_by(ClipboardHistory.createTime.desc())
            .limit(1)
        )
        existing_item = result.scalar_one_or_none()

        if existing_item:
            # 找到重复内容，更新时间戳使其重新出现在顶部
            existing_item.createTime = datetime.now(timezone.utc).isoformat()
            existing_item.updated_at = datetime.now(timezone.utc).isoformat()
            await db.flush()
            await db.refresh(existing_item)

            logger.info(
                f"更新重复内容时间戳: 用户={current_user.username}, "
                f"类型={item.type}, 内容长度={len(item.value)}, "
                f"哈希={content_hash[:8]}..., ID={existing_item.id}"
            )

            # 准备广播数据
            clipboard_data = {
                "id": existing_item.id,
                "type": existing_item.type,
                "group": existing_item.group,
                "value": existing_item.value,
                "device_id": existing_item.device_id,
                "device_name": existing_item.device_name,
                "createTime": format_datetime_str(existing_item.createTime),
                "is_duplicate": True  # 标记为重复内容
            }

            # 对于图片类型，添加下载字段和原始文件名
            if existing_item.type == "image" and existing_item.value:
                clipboard_data["remote_file_id"] = existing_item.value
                clipboard_data["remote_file_url"] = f"/api/v1/files/download/{existing_item.value}"
                if existing_item.file_name:
                    clipboard_data["remote_file_name"] = existing_item.file_name
            
            # 对于文件列表类型，添加remote_files
            if existing_item.type == "files" and existing_item.value:
                clipboard_data["remote_files"] = existing_item.value

            # 推送到队列进行广播（通知时间戳更新）
            await manager.push_to_queue(
                clipboard_data=clipboard_data,
                user_id=current_user.id,
                device_id=item.device_id
            )

            logger.info(f"重复内容时间戳更新已推送到广播队列: ID={existing_item.id}, User={current_user.id}")

            return existing_item

        # 不是重复内容，创建新记录
        db_item = ClipboardHistory(
            id=item.id,  # 前端生成的 nanoid
            type=item.type,
            group=item.group,
            value=item.value,
            search=item.search,
            count=item.count,
            width=item.width,
            height=item.height,
            favorite=item.favorite,
            createTime=item.createTime,
            note=item.note,
            subtype=item.subtype,
            content_hash=content_hash,  # 保存 hash 值
            device_id=item.device_id,
            device_name=item.device_name,
            user_id=current_user.id,  # 设置用户 ID
            synced=1,
            updated_at=datetime.now(timezone.utc).isoformat()
        )

        db.add(db_item)
        await db.flush()  # 刷新以获取 ID
        await db.refresh(db_item)  # 刷新以获取所有字段

        logger.info(f"创建剪贴板项成功: ID={db_item.id}, User={current_user.id}, Hash={content_hash[:8]}...")

        # 推送到 WebSocket 广播队列
        clipboard_data = {
            "id": db_item.id,
            "type": db_item.type,
            "group": db_item.group,
            "value": db_item.value,
            "device_id": db_item.device_id,
            "device_name": db_item.device_name,
            "createTime": format_datetime_str(db_item.createTime),
            "is_duplicate": False  # 新内容
        }

        # 对于图片类型，添加下载字段和原始文件名
        if db_item.type == "image" and db_item.value:
            # value存储的是file_id
            clipboard_data["remote_file_id"] = db_item.value
            clipboard_data["remote_file_url"] = f"/api/v1/files/download/{db_item.value}"
            if db_item.file_name:
                clipboard_data["remote_file_name"] = db_item.file_name
        
        # 对于文件列表类型，添加remote_files
        if db_item.type == "files" and db_item.value:
            # value存储的是remote_files的JSON字符串
            clipboard_data["remote_files"] = db_item.value

        # 推送到队列进行广播
        await manager.push_to_queue(
            clipboard_data=clipboard_data,
            user_id=current_user.id,
            device_id=item.device_id
        )

        logger.info(f"剪贴板数据已推送到广播队列: ID={db_item.id}, User={current_user.id}")

        # 自动清理：检查用户的历史数据量，如果超过限制则删除最旧的数据
        try:
            # 获取用户的历史数据总数
            count_result = await db.execute(
                select(func.count()).where(ClipboardHistory.user_id == current_user.id)
            )
            total_count = count_result.scalar() or 0

            # 如果超过用户设置的最大数量，删除最旧的记录
            if total_count > current_user.max_history_items:
                # 计算需要删除的数量
                delete_count = total_count - current_user.max_history_items

                # 查询最旧的记录（按创建时间排序）
                old_items_result = await db.execute(
                    select(ClipboardHistory)
                    .where(ClipboardHistory.user_id == current_user.id)
                    .order_by(ClipboardHistory.createTime.asc())
                    .limit(delete_count)
                )
                old_items = old_items_result.scalars().all()

                # 删除关联的文件
                deleted_files = 0
                for old_item in old_items:
                    if old_item.type in ['image', 'files'] and old_item.value:
                        file_id = old_item.value
                        if '/' in file_id:
                            file_id = file_id.split('/')[-1]
                        if delete_file_if_exists(file_id):
                            deleted_files += 1

                # 批量删除数据库记录
                old_item_ids = [item.id for item in old_items]
                await db.execute(
                    delete(ClipboardHistory).where(ClipboardHistory.id.in_(old_item_ids))
                )

                logger.info(
                    f"自动清理历史数据: User={current_user.id}, "
                    f"删除记录={len(old_items)}, 删除文件={deleted_files}, "
                    f"当前总数={total_count}, 限制={current_user.max_history_items}"
                )
        except Exception as clean_error:
            # 清理失败不应影响主流程
            logger.error(f"自动清理历史数据失败: {clean_error}")

        return db_item

    except Exception as e:
        logger.error(f"创建剪贴板项失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=ClipboardListResponse, summary="获取剪贴板列表")
async def get_clipboard_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    device_id: Optional[str] = Query(None, description="设备ID筛选"),
    favorite: Optional[bool] = Query(None, description="是否只显示收藏"),
    search: Optional[str] = Query(None, description="搜索内容"),
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user)
):
    """获取剪贴板历史列表,支持分页和筛选（需要认证）"""
    try:
        # 构建基础查询（只查询当前用户的数据）
        query = select(ClipboardHistory).where(ClipboardHistory.user_id == current_user.id)

        # 添加筛选条件
        if device_id:
            query = query.where(ClipboardHistory.device_id == device_id)

        if favorite is not None:
            query = query.where(ClipboardHistory.favorite == favorite)

        if search:
            query = query.where(
                or_(
                    ClipboardHistory.value.like(f"%{search}%"),
                    ClipboardHistory.search.like(f"%{search}%")
                )
            )
        
        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # 添加排序和分页
        offset = (page - 1) * page_size
        query = query.order_by(ClipboardHistory.createTime.desc()).limit(page_size).offset(offset)
        
        # 执行查询
        result = await db.execute(query)
        items = result.scalars().all()
        
        logger.info(f"获取剪贴板列表: 总数={total}, 页码={page}, 每页={page_size}")
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }
        
    except Exception as e:
        logger.error(f"获取剪贴板列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}", response_model=ClipboardItem, summary="获取单个剪贴板项")
async def get_clipboard_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user)
):
    """根据ID获取剪贴板项详情（需要认证，只能访问自己的数据）"""
    try:
        result = await db.execute(
            select(ClipboardHistory)
            .where(ClipboardHistory.id == item_id)
            .where(ClipboardHistory.user_id == current_user.id)
        )
        item = result.scalar_one_or_none()

        if not item:
            raise HTTPException(status_code=404, detail="剪贴板项不存在")

        return item
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取剪贴板项失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{item_id}", response_model=ClipboardItem, summary="更新剪贴板项")
async def update_clipboard_item(
    item_id: str,
    item: ClipboardItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user)
):
    """更新剪贴板项信息（需要认证，只能修改自己的数据）"""
    try:
        # 查询现有项
        result = await db.execute(
            select(ClipboardHistory)
            .where(ClipboardHistory.id == item_id)
            .where(ClipboardHistory.user_id == current_user.id)
        )
        db_item = result.scalar_one_or_none()

        if not db_item:
            raise HTTPException(status_code=404, detail="剪贴板项不存在")

        # 更新字段
        for field, value in item.updates.items():
            if hasattr(db_item, field):
                setattr(db_item, field, value)
        
        # 更新时间戳
        db_item.updated_at = datetime.now(timezone.utc).isoformat()

        await db.flush()
        await db.refresh(db_item)

        logger.info(f"更新剪贴板项成功: ID={item_id}, User={current_user.id}")

        return db_item
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新剪贴板项失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{item_id}", response_model=ApiResponse, summary="删除剪贴板项")
async def delete_clipboard_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user)
):
    """删除指定的剪贴板项（需要认证，只能删除自己的数据）"""
    try:
        # 查询项是否存在
        result = await db.execute(
            select(ClipboardHistory)
            .where(ClipboardHistory.id == item_id)
            .where(ClipboardHistory.user_id == current_user.id)
        )
        item = result.scalar_one_or_none()

        if not item:
            raise HTTPException(status_code=404, detail="剪贴板项不存在")

        # 如果是图片或文件类型，删除对应的文件
        if item.type in ['image', 'files'] and item.value:
            # value 字段存储的是文件ID
            file_id = item.value
            # 如果是完整路径，提取文件名
            if '/' in file_id:
                file_id = file_id.split('/')[-1]

            delete_file_if_exists(file_id)
            logger.info(f"删除剪贴板项关联文件: ID={item_id}, FileID={file_id}")

        # 删除项
        await db.delete(item)
        await db.flush()

        logger.info(f"删除剪贴板项成功: ID={item_id}, User={current_user.id}")

        return {
            "success": True,
            "message": "删除成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除剪贴板项失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/", response_model=ApiResponse, summary="批量删除剪贴板项")
async def batch_delete_clipboard_items(
    ids: list[str] = Body(..., description="要删除的剪贴板项ID列表"),
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user)
):
    """批量删除剪贴板项（需要认证，只能删除自己的数据）"""
    try:
        if not ids:
            raise HTTPException(status_code=400, detail="未提供要删除的ID")

        # 先查询要删除的所有项，以便删除关联的文件
        result = await db.execute(
            select(ClipboardHistory)
            .where(ClipboardHistory.id.in_(ids))
            .where(ClipboardHistory.user_id == current_user.id)
        )
        items = result.scalars().all()

        # 删除图片和文件类型的关联文件
        deleted_files = 0
        for item in items:
            if item.type in ['image', 'files'] and item.value:
                # value 字段存储的是文件ID
                file_id = item.value
                # 如果是完整路径，提取文件名
                if '/' in file_id:
                    file_id = file_id.split('/')[-1]

                if delete_file_if_exists(file_id):
                    deleted_files += 1

        # 使用 delete 语句批量删除（只删除当前用户的数据）
        stmt = (
            delete(ClipboardHistory)
            .where(ClipboardHistory.id.in_(ids))
            .where(ClipboardHistory.user_id == current_user.id)
        )
        result = await db.execute(stmt)
        await db.flush()

        deleted_count = result.rowcount
        logger.info(f"批量删除剪贴板项: 删除记录={deleted_count}, 删除文件={deleted_files}, User={current_user.id}")

        return {
            "success": True,
            "message": f"成功删除 {deleted_count} 条记录"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量删除剪贴板项失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test/generate", response_model=ClipboardItem, summary="测试：生成随机剪贴板数据")
async def generate_test_clipboard(
    type: str = Query("text", description="数据类型: text, html, rtf, code, url, image"),
    count: int = Query(1, ge=1, le=100, description="生成数量"),
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user)
):
    """
    测试接口：生成随机剪贴板数据并推送给在线设备

    支持的类型:
    - text: 随机文本
    - html: 随机 HTML
    - rtf: 随机 RTF（模拟）
    - code: 随机代码
    - url: 随机 URL
    - image: 测试图片

    Args:
        type: 数据类型
        count: 生成数量（1-100）
        current_user: 当前用户

    Returns:
        最后一个创建的剪贴板项
    """
    try:
        logger.info(f"开始生成测试数据: 类型={type}, 数量={count}, 用户={current_user.username}")

        last_item = None

        for i in range(count):
            # 生成随机内容
            width = None
            height = None

            if type == "text":
                value = generate_random_text()
                group = "text"
                subtype = None
            elif type == "html":
                value = generate_random_html()
                group = "text"
                subtype = None
            elif type == "rtf":
                value = generate_random_rtf()
                group = "text"
                subtype = None
            elif type == "code":
                value = generate_random_code()
                group = "text"
                subtype = "code"
            elif type == "url":
                value = generate_random_url()
                group = "text"
                subtype = "link"
            elif type == "image":
                # 使用实际存在的测试图片文件ID
                file_id = "604fc947-7604-4294-8aca-be4270a4997a.png"
                value = f"./uploads/{file_id}"  # 后端路径
                group = "image"
                subtype = None
                width = 800
                height = 600
            else:
                raise HTTPException(status_code=400, detail=f"不支持的类型: {type}")

            # 生成 ID
            item_id = generate(size=21)

            # 计算内容哈希
            content_hash = hashlib.sha256(
                f"{type}:{value}".encode('utf-8')
            ).hexdigest()

            # 创建数据库记录
            db_item = ClipboardHistory(
                id=item_id,
                type=type if type not in ("code", "url") else "text",
                group=group,
                value=value,
                search=value[:100] if len(value) > 100 else value,
                count=width if type == "image" and width else len(value),
                width=width,
                height=height,
                favorite=False,
                createTime=datetime.now(timezone.utc).isoformat(),
                # note=f"测试数据 #{i+1}",
                subtype=subtype,
                content_hash=content_hash,
                device_id="test_device",
                device_name="Test Device",
                user_id=current_user.id,
                synced=1,
                updated_at=datetime.now(timezone.utc).isoformat()
            )

            db.add(db_item)
            await db.flush()
            await db.refresh(db_item)

            logger.info(f"✓ 创建测试数据 {i+1}/{count}: ID={item_id}, 类型={type}, 长度={len(value)}")

            # 推送到 WebSocket 广播队列
            clipboard_data = {
                "id": db_item.id,
                "type": db_item.type,
                "group": db_item.group,
                "value": db_item.value,
                "count": db_item.count,
                "width": db_item.width,
                "height": db_item.height,
                "device_id": db_item.device_id,
                "device_name": db_item.device_name,
                "createTime": format_datetime_str(db_item.createTime),
                "subtype": db_item.subtype,
                "note": db_item.note,
                "is_duplicate": False
            }

            # 如果是图片类型，添加图片相关字段和下载信息
            if type == "image":
                clipboard_data["width"] = width
                clipboard_data["height"] = height
                clipboard_data["count"] = width  # 图片的 count 字段存储的是 width
                # 提取文件ID用于远程下载
                clipboard_data["remote_file_id"] = file_id
                clipboard_data["remote_file_url"] = f"/api/v1/files/download/{file_id}"

            # 推送到队列进行广播
            await manager.push_to_queue(
                clipboard_data=clipboard_data,
                user_id=current_user.id,
                device_id="test_device"
            )

            last_item = db_item

        logger.info(f"✓ 测试数据生成完成: 总数={count}, 用户={current_user.username}")

        return last_item

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成测试数据失败: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


def generate_random_text(min_words: int = 3, max_words: int = 20) -> str:
    """生成随机文本"""
    words = [
        "Hello", "World", "Python", "FastAPI", "WebSocket", "Clipboard", "Sync",
        "Testing", "Random", "Data", "Generate", "Backend", "Frontend", "Database",
        "Server", "Client", "Message", "Broadcast", "Queue", "Event",
        "剪贴板", "同步", "测试", "数据", "随机", "生成", "服务器", "客户端"
    ]

    num_words = random.randint(min_words, max_words)
    selected_words = random.choices(words, k=num_words)

    return " ".join(selected_words)


def generate_random_html() -> str:
    """生成随机 HTML"""
    colors = ["red", "blue", "green", "orange", "purple", "pink"]
    tags = ["strong", "em", "u", "code", "mark"]

    text = generate_random_text(5, 10)
    color = random.choice(colors)
    tag = random.choice(tags)

    return f'<div style="color: {color}"><{tag}>{text}</{tag}></div>'


def generate_random_rtf() -> str:
    """生成随机 RTF（模拟）"""
    text = generate_random_text(3, 8)
    return f'{{\\rtf1\\ansi\\deff0 {{\\fonttbl {{\\f0 Arial;}}}} {{\\colortbl;\\red255\\green0\\blue0;}} \\f0\\fs24 \\cf1 {text}}}'


def generate_random_code() -> str:
    """生成随机代码"""
    templates = [
        '''def hello_world():
    print("Hello, World!")
    return True''',

        '''function sum(a, b) {
    return a + b;
}''',

        '''const fetchData = async () => {
    const response = await fetch('/api/data');
    return response.json();
};''',

        '''class Person:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return f"Hello, {self.name}"''',

        '''SELECT id, name, email
FROM users
WHERE active = 1
ORDER BY created_at DESC
LIMIT 10;'''
    ]

    return random.choice(templates)


def generate_random_url() -> str:
    """生成随机 URL"""
    domains = ["example.com", "test.com", "demo.com", "api.example.com"]
    paths = ["api/users", "data/items", "v1/clipboard", "docs", ""]

    domain = random.choice(domains)
    path = random.choice(paths)

    if path:
        return f"https://{domain}/{path}"
    else:
        return f"https://{domain}"


@router.get("/sync/fetch_updates", summary="获取未同步的剪贴板数据")
async def fetch_sync_updates(
    device_id: str = Query(..., description="设备ID"),
    limit: int = Query(50, ge=1, le=100, description="每次最多获取的数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user)
):
    """
    基于设备上次同步时间，获取未同步的剪贴板数据
    
    工作原理：
    1. 从设备表中获取该设备的 last_sync_time
    2. 查询所有 createTime > last_sync_time 的数据
    3. 返回分页数据
    
    优势：
    - 服务器端记录同步状态，更可靠
    - 避免重复拉取已同步的数据
    - 支持分页获取大量数据
    """
    try:
        # 查询或创建设备记录
        device_result = await db.execute(
            select(Device).where(
                Device.device_id == device_id,
                Device.user_id == current_user.id
            )
        )
        device = device_result.scalar_one_or_none()
        
        # 如果设备不存在，返回空列表（设备应该在首次连接时创建）
        if not device:
            logger.warning(f"设备不存在: device_id={device_id}, user={current_user.username}")
            return {
                "total": 0,
                "page": 1,
                "page_size": limit,
                "items": []
            }
        
        # 构建查询：获取比设备上次同步时间更新的数据
        query = select(ClipboardHistory).where(ClipboardHistory.user_id == current_user.id)
        
        if device.last_sync_time:
            # 只获取比上次同步时间更新的数据
            query = query.where(ClipboardHistory.createTime > device.last_sync_time)
            logger.info(f"获取增量数据: device={device_id}, since={device.last_sync_time}")
        else:
            # 首次同步，获取所有数据
            logger.info(f"首次同步: device={device_id}, 获取所有数据")
        
        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # 添加排序和分页
        query = query.order_by(ClipboardHistory.createTime.asc()).limit(limit).offset(offset)
        
        # 执行查询
        result = await db.execute(query)
        items = result.scalars().all()
        
        # 转换数据，添加图片/文件下载字段
        items_list = []
        for item in items:
            item_data = {
                "id": item.id,
                "type": item.type,
                "group": item.group,
                "value": item.value,
                "search": item.search,
                "count": item.count,
                "width": item.width,
                "height": item.height,
                "favorite": item.favorite,
                "createTime": format_datetime_str(item.createTime),
                "note": item.note,
                "subtype": item.subtype,
                "device_id": item.device_id,
                "device_name": item.device_name,
                "content_hash": item.content_hash,
                "synced": item.synced,
                "updated_at": format_datetime_str(item.updated_at) if item.updated_at else None,
            }
            
            # 对于图片类型，添加下载字段和原始文件名
            if item.type == "image" and item.value:
                item_data["remote_file_id"] = item.value
                item_data["remote_file_url"] = f"/api/v1/files/download/{item.value}"
                if item.file_name:
                    item_data["remote_file_name"] = item.file_name
            
            # 对于文件列表类型，添加 remote_files
            if item.type == "files" and item.value:
                item_data["remote_files"] = item.value
            
            items_list.append(item_data)
        
        logger.info(
            f"同步数据查询: device={device_id}, total={total}, "
            f"returned={len(items)}, offset={offset}, limit={limit}"
        )
        
        return {
            "total": total,
            "page": (offset // limit) + 1,
            "page_size": limit,
            "items": items_list
        }
        
    except Exception as e:
        logger.error(f"获取同步数据失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/update_sync_time", response_model=ApiResponse, summary="更新设备同步时间")
async def update_device_sync_time(
    device_id: str = Body(..., embed=True, description="设备ID"),
    sync_time: str = Body(..., embed=True, description="同步时间 ISO 8601"),
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_active_user)
):
    """
    更新设备的最后同步时间
    
    在客户端完成数据拉取后调用，更新设备的 last_sync_time
    """
    try:
        # 查询设备
        device_result = await db.execute(
            select(Device).where(
                Device.device_id == device_id,
                Device.user_id == current_user.id
            )
        )
        device = device_result.scalar_one_or_none()
        
        if not device:
            # 设备不存在，创建新设备
            device = Device(
                device_id=device_id,
                device_name=device_id,  # 默认使用 device_id 作为名称
                user_id=current_user.id,
                last_sync_time=sync_time,
                created_at=datetime.now(timezone.utc).isoformat()
            )
            db.add(device)
            logger.info(f"创建新设备: device_id={device_id}, user={current_user.username}")
        else:
            # 更新同步时间
            device.last_sync_time = sync_time
            logger.info(
                f"更新设备同步时间: device_id={device_id}, "
                f"sync_time={sync_time}, user={current_user.username}"
            )
        
        await db.flush()
        
        return {
            "success": True,
            "message": "同步时间已更新"
        }
        
    except Exception as e:
        logger.error(f"更新同步时间失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
