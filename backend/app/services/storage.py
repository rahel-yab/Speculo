from __future__ import annotations

import os
from pathlib import Path

import aioboto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings


class StorageService:
    def __init__(self) -> None:
        self._session = aioboto3.Session()

    def _client_kwargs(self) -> dict[str, object]:
        return {
            "service_name": "s3",
            "endpoint_url": f"http{'s' if settings.minio_secure else ''}://{settings.minio_endpoint}",
            "aws_access_key_id": settings.minio_access_key,
            "aws_secret_access_key": settings.minio_secret_key,
            "config": Config(signature_version="s3v4"),
            "region_name": "us-east-1",
        }

    async def ensure_bucket(self) -> None:
        async with self._session.client(**self._client_kwargs()) as client:
            try:
                await client.head_bucket(Bucket=settings.minio_bucket)
            except ClientError:
                await client.create_bucket(Bucket=settings.minio_bucket)

    async def upload_fileobj(self, fileobj, key: str, content_type: str | None = None) -> None:
        extra_args = {"ContentType": content_type} if content_type else None
        async with self._session.client(**self._client_kwargs()) as client:
            await client.upload_fileobj(fileobj, settings.minio_bucket, key, ExtraArgs=extra_args or {})

    async def upload_bytes(self, data: bytes, key: str, content_type: str | None = None) -> None:
        async with self._session.client(**self._client_kwargs()) as client:
            kwargs = {"ContentType": content_type} if content_type else {}
            await client.put_object(Bucket=settings.minio_bucket, Key=key, Body=data, **kwargs)

    async def download_to_path(self, key: str, destination: str) -> str:
        Path(destination).parent.mkdir(parents=True, exist_ok=True)
        async with self._session.client(**self._client_kwargs()) as client:
            await client.download_file(settings.minio_bucket, key, destination)
        return destination

    async def delete_object(self, key: str) -> None:
        async with self._session.client(**self._client_kwargs()) as client:
            await client.delete_object(Bucket=settings.minio_bucket, Key=key)

    async def presigned_get_url(self, key: str, expires_in: int = 3600) -> str:
        async with self._session.client(**self._client_kwargs()) as client:
            return await client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.minio_bucket, "Key": key},
                ExpiresIn=expires_in,
            )

    async def file_size(self, path: str) -> int:
        return os.path.getsize(path)
