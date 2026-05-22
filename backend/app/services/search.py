from __future__ import annotations

from collections import defaultdict
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Chunk, Video
from app.services.embedding import embed_query


def reciprocal_rank_fusion(
    vector_rows: list[dict[str, object]], fts_rows: list[dict[str, object]], limit: int
) -> list[dict[str, object]]:
    fused: dict[int, dict[str, object]] = {}
    scores = defaultdict(float)

    for rank, row in enumerate(vector_rows, start=1):
        scores[row["chunk_id"]] += 1.0 / (rank + 60)
        fused[row["chunk_id"]] = row

    for rank, row in enumerate(fts_rows, start=1):
        scores[row["chunk_id"]] += 1.0 / (rank + 60)
        fused[row["chunk_id"]] = row

    results = []
    for chunk_id, row in fused.items():
        item = dict(row)
        item["relevance_score"] = scores[chunk_id]
        results.append(item)

    results.sort(key=lambda item: item["relevance_score"], reverse=True)
    return results[:limit]


async def hybrid_search(
    db: AsyncSession,
    query: str,
    user_id: int,
    video_id: UUID | None = None,
    limit: int = 10,
) -> list[dict[str, object]]:
    query_embedding = await embed_query(query)

    vector_stmt = (
        select(
            Chunk.id,
            Chunk.video_id,
            Video.title,
            Chunk.text,
            Chunk.start_seconds,
            Chunk.end_seconds,
        )
        .join(Video, Video.id == Chunk.video_id)
        .where(Video.user_id == user_id)
        .order_by(Chunk.embedding.cosine_distance(query_embedding))
        .limit(20)
    )
    if video_id:
        vector_stmt = vector_stmt.where(Video.id == video_id)

    tsquery = func.plainto_tsquery("english", query)
    fts_stmt = (
        select(
            Chunk.id,
            Chunk.video_id,
            Video.title,
            Chunk.text,
            Chunk.start_seconds,
            Chunk.end_seconds,
        )
        .join(Video, Video.id == Chunk.video_id)
        .where(Video.user_id == user_id)
        .where(Chunk.ts_vector.op("@@")(tsquery))
        .order_by(func.ts_rank_cd(Chunk.ts_vector, tsquery).desc())
        .limit(20)
    )
    if video_id:
        fts_stmt = fts_stmt.where(Video.id == video_id)

    vector_rows = [
        {
            "chunk_id": row.id,
            "video_id": str(row.video_id),
            "video_title": row.title,
            "text": row.text,
            "start_seconds": row.start_seconds,
            "end_seconds": row.end_seconds,
        }
        for row in (await db.execute(vector_stmt)).all()
    ]

    fts_rows = [
        {
            "chunk_id": row.id,
            "video_id": str(row.video_id),
            "video_title": row.title,
            "text": row.text,
            "start_seconds": row.start_seconds,
            "end_seconds": row.end_seconds,
        }
        for row in (await db.execute(fts_stmt)).all()
    ]

    return reciprocal_rank_fusion(vector_rows, fts_rows, limit)
