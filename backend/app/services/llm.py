from __future__ import annotations

import json
from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from app.core.config import settings

_client: AsyncAnthropic | None = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def summarize_transcript(full_text: str) -> str:
    if settings.llm_mock:
        preview = " ".join(full_text.split()[:30]) or "No transcript available."
        return f"Mock summary: {preview}. This video has been processed locally. Replace LLM_MOCK with a real Anthropic key for production summaries."

    client = get_client()
    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=220,
        temperature=0.2,
        system="You summarize transcripts into exactly three concise sentences.",
        messages=[{"role": "user", "content": full_text}],
    )
    return "".join(block.text for block in response.content if hasattr(block, "text")).strip()


async def generate_chapters_from_transcript(full_text: str) -> list[dict[str, object]]:
    if settings.llm_mock:
        return [
            {
                "title": "Introduction",
                "summary": "Mock chapter covering the opening section of the video.",
                "start": 0.0,
                "end": 60.0,
            },
            {
                "title": "Main Discussion",
                "summary": "Mock chapter covering the main talking points.",
                "start": 60.0,
                "end": 180.0,
            },
        ]

    client = get_client()
    prompt = (
        "Return ONLY valid JSON as an array of chapter objects with keys "
        "title, summary, start, end. Chapters must cover the full transcript in order."
    )
    response = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1200,
        temperature=0.1,
        system=prompt,
        messages=[{"role": "user", "content": full_text}],
    )
    text = "".join(block.text for block in response.content if hasattr(block, "text")).strip()
    return json.loads(text)


async def stream_answer(question: str, context: str) -> AsyncIterator[str]:
    if settings.llm_mock:
        for token in [
            "Mock answer: ",
            "based on the retrieved transcript chunks, ",
            "this endpoint is streaming correctly.",
        ]:
            yield token
        return

    client = get_client()
    async with client.messages.stream(
        model=settings.anthropic_model,
        max_tokens=700,
        temperature=0.2,
        system=(
            "Answer questions using only the provided transcript context. "
            "If the answer is not present, say so plainly."
        ),
        messages=[
            {
                "role": "user",
                "content": f"Question:\n{question}\n\nContext:\n{context}",
            }
        ],
    ) as stream:
        async for text in stream.text_stream:
            yield text
