from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class VideoStatus(str, enum.Enum):
    pending = "pending"
    extracting = "extracting"
    transcribing = "transcribing"
    embedding = "embedding"
    ready = "ready"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    credits_remaining: Mapped[int] = mapped_column(Integer, nullable=False, default=60, server_default="60")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    videos: Mapped[list["Video"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    credit_logs: Mapped[list["CreditLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[VideoStatus] = mapped_column(
        Enum(VideoStatus, name="videostatus"), nullable=False, default=VideoStatus.pending, server_default=VideoStatus.pending.value
    )
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    audio_s3_key: Mapped[str | None] = mapped_column(String(512))
    thumbnail_s3_key: Mapped[str | None] = mapped_column(String(512))
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="videos")
    transcript: Mapped["Transcript | None"] = relationship(back_populates="video", cascade="all, delete-orphan")
    chunks: Mapped[list["Chunk"]] = relationship(back_populates="video", cascade="all, delete-orphan")
    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="video", cascade="all, delete-orphan", order_by="Chapter.order_index"
    )


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    video: Mapped["Video"] = relationship(back_populates="transcript")


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    start_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    end_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(384), nullable=False)
    ts_vector: Mapped[str] = mapped_column(TSVECTOR, nullable=False)

    video: Mapped["Video"] = relationship(back_populates="chunks")


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    start_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    end_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    video: Mapped["Video"] = relationship(back_populates="chapters")


class CreditLog(Base):
    __tablename__ = "credit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="credit_logs")
