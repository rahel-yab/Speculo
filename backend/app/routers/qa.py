from __future__ import annotations

from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import adjust_credits, check_credits, get_db
from app.core.rate_limit import limiter
from app.db.models import User, Video
from app.services.llm import stream_answer
from app.services.search import hybrid_search

router = APIRouter(tags=["qa"])


@router.get("/qa/{video_id}")
@limiter.limit("30/hour")
async def ask_video(
    request: Request,
    video_id: UUID,
    q: str = Query(..., min_length=2),
    current_user: User = Depends(check_credits),
    db: AsyncSession = Depends(get_db),
):
    del request
    video = await db.scalar(select(Video).where(Video.id == video_id, Video.user_id == current_user.id))
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")

    results = await hybrid_search(db=db, query=q, user_id=current_user.id, video_id=video_id, limit=5)
    context = "\n".join(
        f"[{int(item['start_seconds'] // 60)}:{int(item['start_seconds'] % 60):02d}] {item['text']}"
        for item in results
    )

    await adjust_credits(db, current_user, -1, f"Q&A for {video.title}")
    await db.commit()

    async def event_stream() -> AsyncIterator[bytes]:
        async for chunk in stream_answer(q, context):
            yield chunk.encode("utf-8")

    return StreamingResponse(event_stream(), media_type="text/plain; charset=utf-8")
