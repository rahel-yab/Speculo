from pydantic import BaseModel


class SearchResult(BaseModel):
    chunk_id: int
    video_id: str
    video_title: str
    text: str
    start_seconds: float
    end_seconds: float
    relevance_score: float
