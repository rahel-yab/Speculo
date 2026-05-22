from __future__ import annotations

import asyncio

from sentence_transformers import SentenceTransformer


_embedding_model: SentenceTransformer | None = None


def load_embedding_model(model_name: str) -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(model_name)
    return _embedding_model


def set_embedding_model(model: SentenceTransformer) -> None:
    global _embedding_model
    _embedding_model = model


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if _embedding_model is None:
        raise RuntimeError("Embedding model is not loaded")

    def _encode() -> list[list[float]]:
        return _embedding_model.encode(texts, normalize_embeddings=True).tolist()

    return await asyncio.to_thread(_encode)


async def embed_query(text: str) -> list[float]:
    results = await embed_texts([text])
    return results[0]
