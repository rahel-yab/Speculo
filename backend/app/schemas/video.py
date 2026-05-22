from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import VideoStatus


class VideoCreateResponse(BaseModel):
    id: UUID
    status: VideoStatus
    title: str


class TranscriptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    full_text: str
    language: str | None


class ChapterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: str
    start_seconds: float
    end_seconds: float
    order_index: int


class VideoListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    status: VideoStatus
    duration_seconds: float | None
    created_at: datetime
    summary: str | None
    thumbnail_url: str | None = None


class VideoDetail(VideoListItem):
    video_url: str | None = None
    transcript: TranscriptRead | None = None
    chapters: list[ChapterRead] = Field(default_factory=list)


class ProgressEvent(BaseModel):
    status: str
    percent: int
    message: str
