"""initial schema with pgvector

Revision ID: 20250519_0001
Revises:
Create Date: 2026-05-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql


revision = "20250519_0001"
down_revision = None
branch_labels = None
depends_on = None

video_status_enum = sa.Enum(
    "pending",
    "extracting",
    "transcribing",
    "embedding",
    "ready",
    "failed",
    name="videostatus",
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    video_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("credits_remaining", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "videos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", video_status_enum, nullable=False, server_default="pending"),
        sa.Column("s3_key", sa.String(length=512), nullable=False),
        sa.Column("audio_s3_key", sa.String(length=512), nullable=True),
        sa.Column("thumbnail_s3_key", sa.String(length=512), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "transcripts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("full_text", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("start_seconds", sa.Float(), nullable=False),
        sa.Column("end_seconds", sa.Float(), nullable=False),
        sa.Column("embedding", Vector(384), nullable=False),
        sa.Column("ts_vector", postgresql.TSVECTOR(), nullable=False),
    )

    op.create_index("ix_chunks_video_id", "chunks", ["video_id"])
    op.create_index("ix_chunks_ts_vector", "chunks", ["ts_vector"], postgresql_using="gin")

    op.create_table(
        "chapters",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("video_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("start_seconds", sa.Float(), nullable=False),
        sa.Column("end_seconds", sa.Float(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
    )
    op.create_index("ix_chapters_video_order", "chapters", ["video_id", "order_index"], unique=True)

    op.create_table(
        "credit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_credit_logs_user_id", "credit_logs", ["user_id"])

    op.execute(
        """
        CREATE OR REPLACE FUNCTION chunks_tsvector_update() RETURNS trigger AS $$
        BEGIN
          NEW.ts_vector := to_tsvector('english', coalesce(NEW.text, ''));
          RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_chunks_tsvector_update
        BEFORE INSERT OR UPDATE ON chunks
        FOR EACH ROW EXECUTE FUNCTION chunks_tsvector_update();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_chunks_tsvector_update ON chunks")
    op.execute("DROP FUNCTION IF EXISTS chunks_tsvector_update")
    op.drop_index("ix_credit_logs_user_id", table_name="credit_logs")
    op.drop_table("credit_logs")
    op.drop_index("ix_chapters_video_order", table_name="chapters")
    op.drop_table("chapters")
    op.drop_index("ix_chunks_ts_vector", table_name="chunks", postgresql_using="gin")
    op.drop_index("ix_chunks_video_id", table_name="chunks")
    op.drop_table("chunks")
    op.drop_table("transcripts")
    op.drop_table("videos")
    op.drop_table("users")
    video_status_enum.drop(op.get_bind(), checkfirst=True)
