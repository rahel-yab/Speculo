from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass
from typing import Any

from faster_whisper import WhisperModel


@dataclass
class TranscriptionSegment:
    text: str
    start: float
    end: float


_whisper_model: WhisperModel | None = None


def load_whisper_model(model_name: str) -> WhisperModel:
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel(model_name, device="cpu", compute_type="int8")
    return _whisper_model


def set_whisper_model(model: WhisperModel) -> None:
    global _whisper_model
    _whisper_model = model


def whisper_model_loaded() -> bool:
    return _whisper_model is not None


async def transcribe_audio_file(audio_path: str) -> dict[str, Any]:
    model = _whisper_model
    if model is None:
        raise RuntimeError("Whisper model is not loaded")

    loop = asyncio.get_event_loop()

    def _transcribe() -> dict[str, Any]:
        segments, info = model.transcribe(audio_path, vad_filter=True, beam_size=5)
        rendered_segments = [
            TranscriptionSegment(text=segment.text.strip(), start=float(segment.start), end=float(segment.end))
            for segment in segments
            if segment.text.strip()
        ]
        return {
            "segments": [asdict(segment) for segment in rendered_segments],
            "language": info.language,
        }

    return await loop.run_in_executor(None, _transcribe)
