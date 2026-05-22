from __future__ import annotations

import asyncio
import json
import math
import tempfile
from pathlib import Path
from uuid import UUID

import ffmpeg
from celery import chain
from celery.signals import worker_init
from sqlalchemy import delete, select, text

from app.core.config import settings
from app.core.dependencies import adjust_credits
from app.db.base import AsyncSessionLocal
from app.db.models import Chapter, Chunk, Transcript, User, Video, VideoStatus
from app.services.embedding import embed_texts, load_embedding_model
from app.services.llm import generate_chapters_from_transcript, summarize_transcript
from app.services.storage import StorageService
from app.services.transcription import load_whisper_model, transcribe_audio_file
from app.worker.celery_app import celery_app

storage_service = StorageService()
PROGRESS_CHANNEL = "video:progress:{video_id}"
SEGMENTS_KEY = "video:segments:{video_id}"


@worker_init.connect
def initialize_models(**_: object) -> None:
    load_whisper_model(settings.whisper_model)
    load_embedding_model(settings.embedding_model)


async def publish_progress(video_id: str, status: str, percent: int, message: str) -> None:
    from redis.asyncio import from_url

    redis = from_url(settings.redis_url, decode_responses=True)
    try:
        await redis.publish(
            PROGRESS_CHANNEL.format(video_id=video_id),
            json.dumps({"status": status, "percent": percent, "message": message}),
        )
    finally:
        await redis.close()


async def cache_segments(video_id: str, segments: list[dict[str, object]]) -> None:
    from redis.asyncio import from_url

    redis = from_url(settings.redis_url, decode_responses=True)
    try:
        await redis.set(SEGMENTS_KEY.format(video_id=video_id), json.dumps(segments), ex=3600)
    finally:
        await redis.close()


async def get_cached_segments(video_id: str) -> list[dict[str, object]]:
    from redis.asyncio import from_url

    redis = from_url(settings.redis_url, decode_responses=True)
    try:
        payload = await redis.get(SEGMENTS_KEY.format(video_id=video_id))
        return json.loads(payload) if payload else []
    finally:
        await redis.close()


async def clear_cached_segments(video_id: str) -> None:
    from redis.asyncio import from_url

    redis = from_url(settings.redis_url, decode_responses=True)
    try:
        await redis.delete(SEGMENTS_KEY.format(video_id=video_id))
    finally:
        await redis.close()


async def set_video_status(video_id: str, status: VideoStatus) -> Video:
    async with AsyncSessionLocal() as session:
        video = await session.get(Video, UUID(video_id))
        if video is None:
            raise ValueError(f"Video {video_id} not found")
        video.status = status
        await session.commit()
        await session.refresh(video)
        return video


async def fail_video(video_id: str, message: str) -> None:
    async with AsyncSessionLocal() as session:
        video = await session.get(Video, UUID(video_id))
        if video:
            video.status = VideoStatus.failed
            await session.commit()
    await publish_progress(video_id, VideoStatus.failed.value, 100, message)


async def run_ffmpeg_extract(video_path: str, audio_path: str, thumbnail_path: str) -> float:
    loop = asyncio.get_event_loop()

    def _extract() -> float:
        probe = ffmpeg.probe(video_path)
        duration = float(probe["format"]["duration"])
        (
            ffmpeg.input(video_path)
            .output(audio_path, acodec="mp3", ac=1, ar="16000")
            .overwrite_output()
            .run(quiet=True)
        )
        (
            ffmpeg.input(video_path, ss=0.5)
            .output(thumbnail_path, vframes=1)
            .overwrite_output()
            .run(quiet=True)
        )
        return duration

    return await loop.run_in_executor(None, _extract)


def build_chunks(segments: list[dict[str, object]], max_chars: int = 750) -> list[dict[str, object]]:
    chunks: list[dict[str, object]] = []
    current: list[dict[str, object]] = []
    current_len = 0

    for segment in segments:
        segment_text = str(segment["text"]).strip()
        if not segment_text:
            continue
        projected = current_len + len(segment_text) + 1
        if current and projected > max_chars:
            chunks.append(
                {
                    "text": " ".join(str(item["text"]).strip() for item in current),
                    "start_seconds": float(current[0]["start"]),
                    "end_seconds": float(current[-1]["end"]),
                }
            )
            current = []
            current_len = 0
        current.append(segment)
        current_len += len(segment_text) + 1

    if current:
        chunks.append(
            {
                "text": " ".join(str(item["text"]).strip() for item in current),
                "start_seconds": float(current[0]["start"]),
                "end_seconds": float(current[-1]["end"]),
            }
        )

    return chunks


@celery_app.task(bind=True, name="app.worker.tasks.extract_audio")
def extract_audio(self, video_id: str) -> dict[str, object]:
    try:
        return asyncio.run(_extract_audio(video_id))
    except Exception as exc:
        asyncio.run(fail_video(video_id, f"Audio extraction failed: {exc}"))
        raise


async def _extract_audio(video_id: str) -> dict[str, object]:
    await set_video_status(video_id, VideoStatus.extracting)
    await publish_progress(video_id, VideoStatus.extracting.value, 15, "Extracting audio track")

    async with AsyncSessionLocal() as session:
        video = await session.get(Video, UUID(video_id))
        if video is None:
            raise ValueError("Video not found")

        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = str(Path(tmpdir) / "source.mp4")
            audio_path = str(Path(tmpdir) / "audio.mp3")
            thumb_path = str(Path(tmpdir) / "thumb.jpg")
            await storage_service.download_to_path(video.s3_key, source_path)
            duration = await run_ffmpeg_extract(source_path, audio_path, thumb_path)

            audio_key = f"videos/{video_id}/audio.mp3"
            thumb_key = f"videos/{video_id}/thumbnail.jpg"

            with open(audio_path, "rb") as audio_file:
                await storage_service.upload_fileobj(audio_file, audio_key, "audio/mpeg")
            with open(thumb_path, "rb") as thumb_file:
                await storage_service.upload_fileobj(thumb_file, thumb_key, "image/jpeg")

        video.audio_s3_key = audio_key
        video.thumbnail_s3_key = thumb_key
        video.duration_seconds = duration
        await session.commit()

    await publish_progress(video_id, VideoStatus.extracting.value, 25, "Audio uploaded to object storage")
    return {"video_id": video_id}


@celery_app.task(bind=True, name="app.worker.tasks.transcribe")
def transcribe(self, previous: dict[str, object], video_id: str) -> dict[str, object]:
    try:
        return asyncio.run(_transcribe(previous, video_id))
    except Exception as exc:
        asyncio.run(fail_video(video_id, f"Transcription failed: {exc}"))
        raise


async def _transcribe(previous: dict[str, object], video_id: str) -> dict[str, object]:
    del previous
    await set_video_status(video_id, VideoStatus.transcribing)
    await publish_progress(video_id, VideoStatus.transcribing.value, 35, "Transcribing audio")

    async with AsyncSessionLocal() as session:
        video = await session.get(Video, UUID(video_id))
        if video is None or not video.audio_s3_key:
            raise ValueError("Audio asset not found")

        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = str(Path(tmpdir) / "audio.mp3")
            await storage_service.download_to_path(video.audio_s3_key, audio_path)
            transcription = await transcribe_audio_file(audio_path)

        segments = transcription["segments"]
        full_text = " ".join(segment["text"] for segment in segments)
        language = transcription["language"]
        duration = float(segments[-1]["end"]) if segments else (video.duration_seconds or 0.0)
        minutes = max(1, math.ceil(duration / 60)) if duration else 1

        existing = await session.scalar(select(Transcript).where(Transcript.video_id == video.id))
        if existing:
            existing.full_text = full_text
            existing.language = language
        else:
            session.add(Transcript(video_id=video.id, full_text=full_text, language=language))

        video.duration_seconds = duration
        owner = await session.get(User, video.user_id)
        if owner is None:
            raise ValueError("Video owner not found")
        await adjust_credits(session, owner, -minutes, f"Upload charge for {video.title}")
        await session.commit()

    await cache_segments(video_id, segments)
    await publish_progress(video_id, VideoStatus.transcribing.value, 50, "Transcript completed")
    return {"video_id": video_id, "segment_count": len(segments)}


@celery_app.task(bind=True, name="app.worker.tasks.chunk_and_embed")
def chunk_and_embed(self, previous: dict[str, object], video_id: str) -> dict[str, object]:
    try:
        return asyncio.run(_chunk_and_embed(previous, video_id))
    except Exception as exc:
        asyncio.run(fail_video(video_id, f"Embedding failed: {exc}"))
        raise


async def _chunk_and_embed(previous: dict[str, object], video_id: str) -> dict[str, object]:
    del previous
    await set_video_status(video_id, VideoStatus.embedding)
    await publish_progress(video_id, VideoStatus.embedding.value, 60, "Chunking transcript and generating embeddings")

    segments = await get_cached_segments(video_id)
    if not segments:
        raise ValueError("Transcript segments are missing from cache")

    chunk_payloads = build_chunks(segments)
    embeddings = await embed_texts([item["text"] for item in chunk_payloads])

    async with AsyncSessionLocal() as session:
        video = await session.get(Video, UUID(video_id))
        if video is None:
            raise ValueError("Video not found")

        await session.execute(delete(Chunk).where(Chunk.video_id == UUID(video_id)))
        for item, embedding in zip(chunk_payloads, embeddings, strict=True):
            await session.execute(
                text(
                    """
                    INSERT INTO chunks (video_id, text, start_seconds, end_seconds, embedding, ts_vector)
                    VALUES (:video_id, :text, :start_seconds, :end_seconds, :embedding, to_tsvector('english', :text))
                    """
                ),
                {
                    "video_id": video.id,
                    "text": item["text"],
                    "start_seconds": item["start_seconds"],
                    "end_seconds": item["end_seconds"],
                    "embedding": embedding,
                },
            )
        await session.commit()

    await publish_progress(video_id, VideoStatus.embedding.value, 72, "Embeddings stored in pgvector")
    return {"video_id": video_id, "chunk_count": len(chunk_payloads)}


@celery_app.task(bind=True, name="app.worker.tasks.generate_chapters")
def generate_chapters(self, previous: dict[str, object], video_id: str) -> dict[str, object]:
    try:
        return asyncio.run(_generate_chapters(previous, video_id))
    except Exception as exc:
        asyncio.run(fail_video(video_id, f"Chapter generation failed: {exc}"))
        raise


async def _generate_chapters(previous: dict[str, object], video_id: str) -> dict[str, object]:
    del previous
    await publish_progress(video_id, VideoStatus.embedding.value, 82, "Generating chapters")

    async with AsyncSessionLocal() as session:
        transcript = await session.scalar(
            select(Transcript).join(Video, Video.id == Transcript.video_id).where(Video.id == UUID(video_id))
        )
        if transcript is None:
            raise ValueError("Transcript not found")

        chapters = await generate_chapters_from_transcript(transcript.full_text)
        await session.execute(delete(Chapter).where(Chapter.video_id == UUID(video_id)))
        for index, chapter in enumerate(chapters):
            session.add(
                Chapter(
                    video_id=video.id,
                    title=str(chapter["title"]),
                    summary=str(chapter["summary"]),
                    start_seconds=float(chapter["start"]),
                    end_seconds=float(chapter["end"]),
                    order_index=index,
                )
            )
        await session.commit()

    await publish_progress(video_id, VideoStatus.embedding.value, 90, "Chapters generated")
    return {"video_id": video_id, "chapters": True}


@celery_app.task(bind=True, name="app.worker.tasks.summarize")
def summarize(self, previous: dict[str, object], video_id: str) -> dict[str, object]:
    try:
        return asyncio.run(_summarize(previous, video_id))
    except Exception as exc:
        asyncio.run(fail_video(video_id, f"Summarization failed: {exc}"))
        raise


async def _summarize(previous: dict[str, object], video_id: str) -> dict[str, object]:
    del previous
    await publish_progress(video_id, VideoStatus.embedding.value, 95, "Writing final summary")

    async with AsyncSessionLocal() as session:
        video = await session.get(Video, UUID(video_id))
        transcript = await session.scalar(select(Transcript).where(Transcript.video_id == UUID(video_id)))
        if video is None or transcript is None:
            raise ValueError("Video transcript not found")
        video.summary = await summarize_transcript(transcript.full_text)
        await session.commit()

    return {"video_id": video_id}


@celery_app.task(bind=True, name="app.worker.tasks.mark_ready")
def mark_ready(self, previous: dict[str, object], video_id: str) -> dict[str, object]:
    try:
        return asyncio.run(_mark_ready(previous, video_id))
    except Exception as exc:
        asyncio.run(fail_video(video_id, f"Finalization failed: {exc}"))
        raise


async def _mark_ready(previous: dict[str, object], video_id: str) -> dict[str, object]:
    del previous
    await set_video_status(video_id, VideoStatus.ready)
    await clear_cached_segments(video_id)
    await publish_progress(video_id, VideoStatus.ready.value, 100, "Video is ready")
    return {"video_id": video_id, "status": VideoStatus.ready.value}


def build_video_pipeline(video_id: str):
    return chain(
        extract_audio.s(video_id),
        transcribe.s(video_id),
        chunk_and_embed.s(video_id),
        generate_chapters.s(video_id),
        summarize.s(video_id),
        mark_ready.s(video_id),
    )


def enqueue_video_pipeline(video_id: str) -> str:
    result = build_video_pipeline(video_id).apply_async()
    return result.id
