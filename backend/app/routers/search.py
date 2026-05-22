from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.db.models import User
from app.schemas.search import SearchResult
from app.services.search import hybrid_search

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[SearchResult])
async def search_chunks(
    q: str = Query(..., min_length=2),
    video_id: UUID | None = None,
    limit: int = Query(default=10, ge=1, le=25),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, object]]:
    return await hybrid_search(db=db, query=q, user_id=current_user.id, video_id=video_id, limit=limit)
