from __future__ import annotations

import json
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import check_credits, get_current_user, get_current_user_from_ws_token, get_db
from app.core.rate_limit import limiter
from app.db.base import AsyncSessionLocal
from app.db.models import Transcript, User, Video, VideoStatus
from app.schemas.video import ProgressEvent, VideoCreateResponse, VideoDetail, VideoListItem
from app.services.storage import StorageService
from app.worker.tasks import enqueue_video_pipeline

router = APIRouter(prefix="/videos", tags=["videos"])
storage_service = StorageService()


def readable_size_exceeded(file: UploadFile) -> bool:
    position = file.file.tell()
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(position)
    return size > settings.max_upload_size_mb * 1024 * 1024


@router.post("", response_model=VideoCreateResponse)
@limiter.limit("5/hour")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(check_credits),
    db: AsyncSession = Depends(get_db),
) -> VideoCreateResponse:
    del request
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only video uploads are supported")
    if readable_size_exceeded(file):
        raise HTTPException(status_code=413, detail="Upload exceeds configured size limit")

    video_id = uuid4()
    extension = Path(file.filename or "upload.mp4").suffix or ".mp4"
    s3_key = f"videos/{video_id}/source{extension}"
    file.file.seek(0)
    await storage_service.upload_fileobj(file.file, s3_key, file.content_type)

    video = Video(
        id=video_id,
        user_id=current_user.id,
        title=Path(file.filename or "Untitled Video").stem,
        status=VideoStatus.pending,
        s3_key=s3_key,
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)
    enqueue_video_pipeline(str(video.id))
    return VideoCreateResponse(id=video.id, status=video.status, title=video.title)


@router.get("", response_model=list[VideoListItem])
async def list_videos(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[VideoListItem]:
    videos = list(
        (
            await db.scalars(
                select(Video).where(Video.user_id == current_user.id).order_by(Video.created_at.desc())
            )
        ).all()
    )
    items: list[VideoListItem] = []
    for video in videos:
        thumbnail_url = (
            await storage_service.presigned_get_url(video.thumbnail_s3_key)
            if video.thumbnail_s3_key
            else None
        )
        items.append(
            VideoListItem.model_validate(
                {
                    **video.__dict__,
                    "thumbnail_url": thumbnail_url,
                }
            )
        )
    return items


@router.get("/{video_id}", response_model=VideoDetail)
async def get_video(
    video_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VideoDetail:
    video = await db.scalar(select(Video).where(Video.id == video_id, Video.user_id == current_user.id))
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    transcript = await db.scalar(select(Transcript).where(Transcript.video_id == video.id))
    await db.refresh(video, attribute_names=["chapters"])
    payload = {
        **video.__dict__,
        "video_url": await storage_service.presigned_get_url(video.s3_key) if video.s3_key else None,
        "thumbnail_url": await storage_service.presigned_get_url(video.thumbnail_s3_key)
        if video.thumbnail_s3_key
        else None,
        "transcript": transcript,
        "chapters": video.chapters,
    }
    return VideoDetail.model_validate(payload)


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    video = await db.scalar(select(Video).where(Video.id == video_id, Video.user_id == current_user.id))
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    s3_keys = [key for key in [video.s3_key, video.audio_s3_key, video.thumbnail_s3_key] if key]
    await db.delete(video)
    await db.commit()
    for key in s3_keys:
        await storage_service.delete_object(key)


@router.websocket("/{video_id}/progress")
async def video_progress(websocket: WebSocket, video_id: str):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    async with AsyncSessionLocal() as session:
        try:
            current_user = await get_current_user_from_ws_token(token, session)
        except HTTPException:
            await websocket.close(code=4401)
            return
        video = await session.scalar(
            select(Video).where(Video.id == UUID(video_id), Video.user_id == current_user.id)
        )
        if video is None:
            await websocket.close(code=4404)
            return
        if video.status in {VideoStatus.ready, VideoStatus.failed}:
            await websocket.send_json(
                ProgressEvent(status=video.status.value, percent=100, message=f"Video is {video.status.value}").model_dump()
            )
            await websocket.close()
            return

    from redis.asyncio import from_url

    redis = from_url(settings.redis_url, decode_responses=True)
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"video:progress:{video_id}")
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=5.0)
            if not message:
                continue
            payload = json.loads(message["data"])
            await websocket.send_json(payload)
            if payload["status"] in {VideoStatus.ready.value, VideoStatus.failed.value}:
                await websocket.close()
                break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"video:progress:{video_id}")
        await pubsub.close()
        await redis.close()
