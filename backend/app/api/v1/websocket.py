"""
WebSocket API 路由（对齐前端 Schema，实现所有同步操作）
"""
import hashlib
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy import select, delete, func
from loguru import logger
from jose import JWTError, jwt

from app.core.websocket import manager
from app.core.database import db
from app.models.db_models import ClipboardHistory, User as DBUser
from app.core.security import SECRET_KEY, ALGORITHM, get_user_by_username
from app.config import settings

router = APIRouter()
UPLOAD_DIR = Path(settings.UPLOAD_DIR)


def delete_file_if_exists(file_id: str) -> bool:
    """删除文件"""
    try:
        file_path = UPLOAD_DIR / file_id.replace("file_id:", "")
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            logger.info(f"文件删除: {file_id}")
            return True
        return False
    except Exception as e:
        logger.warning(f"删除文件失败: {file_id}, {e}")
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


async def verify_websocket_token(token: str) -> DBUser:
    """验证 WebSocket Token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise Exception("无效token")

        if not db.async_session_maker:
            db.init_engine()

        async with db.async_session_maker() as session:
            user = await get_user_by_username(username, session)
            if not user or not user.is_active:
                raise Exception("用户不存在或未激活")
            return user
    except JWTError:
        raise Exception("token验证失败")


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    device_id: str = Query(...),
    device_name: str = Query(None),
    token: str = Query(...)
):
    """WebSocket 连接端点"""
    manager.start_queue_consumer()

    # 认证
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user = await verify_websocket_token(token)
        logger.info(f"[WS] 认证成功: {user.username}, 设备={device_id}")
    except Exception as e:
        logger.warning(f"[WS] 认证失败: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 连接
    await manager.connect(websocket, device_id, device_name, user.id, user.username)

    try:
        # 欢迎消息
        await websocket.send_json({
            "type": "connected",
            "data": {
                "device_id": device_id,
                "message": "WebSocket 连接成功",
                "user": user.username,
                "online_devices": manager.get_online_devices(user_id=user.id)
            }
        })

        # 消息循环
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            message_id = data.get("message_id")
            payload = data.get("data", {})

            logger.info(f"[WS] 收到: action={action}, payload={payload}")

            try:
                if action == "sync_clipboard":
                    await handle_sync_clipboard(websocket, payload, user, device_id, message_id)

                elif action == "delete_clipboard":
                    await handle_delete_clipboard(websocket, payload, user, device_id, message_id)

                elif action == "delete_clipboard_batch":
                    await handle_delete_batch(websocket, payload, user, device_id, message_id)

                elif action == "update_clipboard":
                    await handle_update_clipboard(websocket, payload, user, device_id, message_id)

                elif action == "fetch_history":
                    await handle_fetch_history(websocket, payload, user, message_id)

                elif action == "clear_history":
                    await handle_clear_history(websocket, payload, user, device_id, message_id)

                elif action == "get_online_devices":
                    await websocket.send_json({
                        "type": "online_devices",
                        "message_id": message_id,
                        "data": {
                            "devices": manager.get_online_devices(user_id=user.id),
                            "count": manager.get_connection_count(user_id=user.id)
                        }
                    })

                elif action == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "data": {"timestamp": payload.get("timestamp")}
                    })

                else:
                    await websocket.send_json({
                        "type": "error",
                        "message_id": message_id,
                        "data": {"message": f"未知操作: {action}", "code": "UNKNOWN_ACTION"}
                    })

            except Exception as e:
                logger.error(f"[WS] 处理失败: action={action}, error={e}")
                import traceback
                logger.error(traceback.format_exc())
                await websocket.send_json({
                    "type": "error",
                    "message_id": message_id,
                    "data": {"message": str(e), "code": "INTERNAL_ERROR"}
                })

    except WebSocketDisconnect:
        manager.disconnect(device_id)
        await manager.broadcast_system_message(
            "device_offline",
            {"device_id": device_id, "online_count": manager.get_connection_count(user_id=user.id)},
            user_id=user.id
        )
        logger.info(f"[WS] 断开: {device_id}")

    except Exception as e:
        logger.error(f"[WS] 错误: {device_id}, {e}")
        manager.disconnect(device_id)


# ===== 处理函数 =====

def calculate_file_content_hash(item_type: str, value: str) -> str:
    """
    计算内容哈希（WebSocket版本）
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


async def handle_sync_clipboard(websocket, payload, user, device_id, message_id):
    """处理剪贴板同步（对齐前端字段名）"""
    if not db.async_session_maker:
        db.init_engine()

    # 先处理文件字段，将remote_file_id或remote_files存储到value
    value_for_hash = payload.get('value')
    if payload.get('type') == 'image' and payload.get('remote_file_id'):
        value_for_hash = payload.get('remote_file_id')
    elif payload.get('type') == 'files' and payload.get('remote_files'):
        value_for_hash = payload.get('remote_files')

    # 计算哈希（使用文件内容而非文件名）
    content_hash = payload.get("content_hash")
    if not content_hash:
        content_hash = calculate_file_content_hash(payload['type'], value_for_hash)
        payload["content_hash"] = content_hash

    async with db.async_session_maker() as session:
        # 检查重复
        result = await session.execute(
            select(ClipboardHistory).where(
                ClipboardHistory.user_id == user.id,
                ClipboardHistory.content_hash == content_hash
            ).limit(1)
        )
        existing = result.scalar_one_or_none()

        if existing:
            # 更新时间戳
            existing.createTime = payload.get("createTime")
            # existing.updated_at = payload.get("updated_at")
            await session.commit()

            await websocket.send_json({
                "type": "timestamp_updated",
                "message_id": message_id,
                "data": {"message": "重复内容，已更新时间戳", "clipboard_id": existing.id}
            })

            await manager.broadcast_system_message(
                "timestamp_updated",
                {"clipboard_item": {"id": existing.id, "createTime": existing.createTime}},
                exclude_device=device_id,
                user_id=user.id
            )
        else:
            # 过滤掉前端特有的字段（不存储到数据库）
            filtered_payload = {
                k: v for k, v in payload.items()
                if k not in ('remote_files', 'remote_file_id', 'remote_file_url', 'remote_file_name', 'is_duplicate')
            }

            # 对于文件列表，将remote_files的内容存储到value字段
            if payload.get('type') == 'files' and payload.get('remote_files'):
                filtered_payload['value'] = payload.get('remote_files')
                logger.info(f"[WS] 文件列表类型，使用remote_files作为value: {filtered_payload['value']}")

            # 对于图片，将remote_file_id存储到value字段，原始文件名存储到file_name字段
            if payload.get('type') == 'image' and payload.get('remote_file_id'):
                filtered_payload['value'] = payload.get('remote_file_id')
                if payload.get('remote_file_name'):
                    filtered_payload['file_name'] = payload.get('remote_file_name')
                logger.info(f"[WS] 图片类型，file_id={filtered_payload['value']}, file_name={filtered_payload.get('file_name')}")

            # 强制使用 WebSocket 连接的 device_id，忽略 payload 中的（防止伪造）
            filtered_payload['device_id'] = device_id
            # 如果 payload 中有 device_name，使用它；否则使用默认值
            if 'device_name' not in filtered_payload:
                filtered_payload['device_name'] = f"Device_{device_id[:8]}"

            # 插入新记录（字段名完全对齐前端）
            db_item = ClipboardHistory(
                **filtered_payload,
                user_id=user.id
            )
            session.add(db_item)
            await session.commit()

            logger.info(f"[WS] 同步: ID={db_item.id}, type={db_item.type}, user={user.username}")

            # 响应发送者
            await websocket.send_json({
                "type": "sync_confirmed",
                "message_id": message_id,
                "data": {
                    "message": "剪贴板已同步",
                    "clipboard_id": db_item.id,
                    "synced_to": manager.get_connection_count(user.id) - 1
                }
            })

            # 准备广播数据，为图片和文件类型添加下载字段
            broadcast_data = {
                "id": db_item.id,
                "type": db_item.type,
                "group": db_item.group,
                "value": db_item.value,  # 对于图片和文件，这里已经是file_id或file_id列表
                "search": db_item.search,
                "count": db_item.count,
                "width": db_item.width,
                "height": db_item.height,
                "favorite": db_item.favorite,
                "createTime": format_datetime_str(db_item.createTime),
                "note": db_item.note,
                "subtype": db_item.subtype,
                "device_id": db_item.device_id,
                "device_name": db_item.device_name,
                "content_hash": db_item.content_hash,
                "synced": db_item.synced,
                "updated_at": format_datetime_str(db_item.updated_at) if db_item.updated_at else None,
            }

            # 对于图片类型，添加下载URL和原始文件名
            if db_item.type == "image" and db_item.value:
                # value存储的就是file_id
                file_id = db_item.value
                broadcast_data["remote_file_id"] = file_id
                broadcast_data["remote_file_url"] = f"/api/v1/files/download/{file_id}"
                # 从数据库获取原始文件名
                if db_item.file_name:
                    broadcast_data["remote_file_name"] = db_item.file_name
                logger.info(f"[WS] 图片广播: file_id={file_id}, file_name={broadcast_data.get('remote_file_name')}")

            # 对于文件列表类型，添加remote_files
            if db_item.type == "files" and db_item.value:
                # value存储的就是remote_files的JSON字符串
                broadcast_data["remote_files"] = db_item.value
                logger.info(f"[WS] 文件列表广播: remote_files={db_item.value}")

            # 广播给其他设备
            await manager.broadcast_clipboard(broadcast_data, device_id, user_id=user.id)


async def handle_delete_clipboard(websocket, payload, user, device_id, message_id):
    """处理删除单个"""
    clipboard_id = payload.get("id")
    if not clipboard_id:
        await websocket.send_json({
            "type": "error",
            "message_id": message_id,
            "data": {"message": "缺少 id", "code": "VALIDATION_ERROR"}
        })
        return

    if not db.async_session_maker:
        db.init_engine()

    async with db.async_session_maker() as session:
        result = await session.execute(
            select(ClipboardHistory).where(
                ClipboardHistory.id == clipboard_id,
                ClipboardHistory.user_id == user.id
            )
        )
        item = result.scalar_one_or_none()

        if not item:
            await websocket.send_json({
                "type": "error",
                "message_id": message_id,
                "data": {"message": "剪贴板项不存在", "code": "NOT_FOUND"}
            })
            return

        # 删除文件
        if item.type in ["image", "files"] and item.value and item.value.startswith("file_id:"):
            delete_file_if_exists(item.value)

        # 删除数据库记录
        await session.delete(item)
        await session.commit()

        logger.info(f"[WS] 删除: ID={clipboard_id}, user={user.username}")

        # 响应
        await websocket.send_json({
            "type": "delete_confirmed",
            "message_id": message_id,
            "data": {"message": "删除成功", "clipboard_id": clipboard_id}
        })

        # 广播
        await manager.broadcast_system_message(
            "clipboard_deleted",
            {"id": clipboard_id},
            exclude_device=device_id,
            user_id=user.id
        )


async def handle_delete_batch(websocket, payload, user, device_id, message_id):
    """处理批量删除"""
    ids = payload.get("ids", [])
    if not ids:
        await websocket.send_json({
            "type": "error",
            "message_id": message_id,
            "data": {"message": "缺少 ids", "code": "VALIDATION_ERROR"}
        })
        return

    if not db.async_session_maker:
        db.init_engine()

    async with db.async_session_maker() as session:
        result = await session.execute(
            select(ClipboardHistory).where(
                ClipboardHistory.id.in_(ids),
                ClipboardHistory.user_id == user.id
            )
        )
        items = result.scalars().all()

        # 删除文件
        for item in items:
            if item.type in ["image", "files"] and item.value and item.value.startswith("file_id:"):
                delete_file_if_exists(item.value)

        # 删除记录
        await session.execute(
            delete(ClipboardHistory).where(
                ClipboardHistory.id.in_(ids),
                ClipboardHistory.user_id == user.id
            )
        )
        await session.commit()

        logger.info(f"[WS] 批量删除: count={len(items)}, user={user.username}")

        await websocket.send_json({
            "type": "delete_batch_confirmed",
            "message_id": message_id,
            "data": {"message": "批量删除成功", "deleted_count": len(items), "ids": ids}
        })

        await manager.broadcast_system_message(
            "clipboard_deleted_batch",
            {"ids": ids},
            exclude_device=device_id,
            user_id=user.id
        )


async def handle_update_clipboard(websocket, payload, user, device_id, message_id):
    """处理更新字段"""
    clipboard_id = payload.get("id")
    updates = payload.get("updates", {})

    if not clipboard_id or not updates:
        await websocket.send_json({
            "type": "error",
            "message_id": message_id,
            "data": {"message": "缺少 id 或 updates", "code": "VALIDATION_ERROR"}
        })
        return

    if not db.async_session_maker:
        db.init_engine()

    async with db.async_session_maker() as session:
        result = await session.execute(
            select(ClipboardHistory).where(
                ClipboardHistory.id == clipboard_id,
                ClipboardHistory.user_id == user.id
            )
        )
        item = result.scalar_one_or_none()

        if not item:
            await websocket.send_json({
                "type": "error",
                "message_id": message_id,
                "data": {"message": "剪贴板项不存在", "code": "NOT_FOUND"}
            })
            return

        # 更新字段
        for key, value in updates.items():
            if hasattr(item, key):
                setattr(item, key, value)

        await session.commit()

        logger.info(f"[WS] 更新: ID={clipboard_id}, fields={list(updates.keys())}, user={user.username}")

        await websocket.send_json({
            "type": "update_confirmed",
            "message_id": message_id,
            "data": {"message": "更新成功", "clipboard_id": clipboard_id}
        })

        await manager.broadcast_system_message(
            "clipboard_updated",
            {"id": clipboard_id, "updates": updates},
            exclude_device=device_id,
            user_id=user.id
        )


async def handle_fetch_history(websocket, payload, user, message_id):
    """处理获取历史记录"""
    since = payload.get("since")
    limit = payload.get("limit", 100)
    offset = payload.get("offset", 0)

    if not db.async_session_maker:
        db.init_engine()

    async with db.async_session_maker() as session:
        query = select(ClipboardHistory).where(ClipboardHistory.user_id == user.id)

        if since:
            query = query.where(ClipboardHistory.createTime > since)

        query = query.order_by(ClipboardHistory.createTime.desc())

        # 获取总数
        count_result = await session.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar() or 0

        # 分页
        query = query.offset(offset).limit(limit)
        result = await session.execute(query)
        items = result.scalars().all()

        # 转换为字典（对齐前端字段名）
        items_dict = []
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
                # 从数据库获取原始文件名
                if item.file_name:
                    item_data["remote_file_name"] = item.file_name
            
            # 对于文件列表类型，添加 remote_files
            if item.type == "files" and item.value:
                item_data["remote_files"] = item.value
            
            items_dict.append(item_data)

        await websocket.send_json({
            "type": "history_data",
            "message_id": message_id,
            "data": {
                "total": total,
                "has_more": (offset + limit) < total,
                "items": items_dict
            }
        })

        logger.info(f"[WS] 获取历史: count={len(items)}/{total}, user={user.username}")


async def handle_clear_history(websocket, payload, user, device_id, message_id):
    """处理清空历史记录"""
    if not payload.get("confirm"):
        await websocket.send_json({
            "type": "error",
            "message_id": message_id,
            "data": {"message": "需要确认操作", "code": "CONFIRMATION_REQUIRED"}
        })
        return

    if not db.async_session_maker:
        db.init_engine()

    async with db.async_session_maker() as session:
        # 获取所有记录
        result = await session.execute(
            select(ClipboardHistory).where(ClipboardHistory.user_id == user.id)
        )
        items = result.scalars().all()

        # 删除文件
        deleted_files = 0
        for item in items:
            if item.type in ["image", "files"] and item.value and item.value.startswith("file_id:"):
                if delete_file_if_exists(item.value):
                    deleted_files += 1

        # 删除所有记录
        deleted_count = len(items)
        await session.execute(
            delete(ClipboardHistory).where(ClipboardHistory.user_id == user.id)
        )
        await session.commit()

        logger.info(f"[WS] 清空历史: count={deleted_count}, files={deleted_files}, user={user.username}")

        await websocket.send_json({
            "type": "clear_confirmed",
            "message_id": message_id,
            "data": {
                "message": "历史记录已清空",
                "deleted_count": deleted_count,
                "deleted_files": deleted_files
            }
        })

        await manager.broadcast_system_message(
            "history_cleared",
            {"deleted_count": deleted_count},
            exclude_device=device_id,
            user_id=user.id
        )


@router.get("/online")
async def get_online_devices():
    """获取在线设备列表（HTTP 接口，可选）"""
    return {
        "success": True,
        "data": {
            "devices": manager.get_online_devices(),
            "count": manager.get_connection_count()
        }
    }
