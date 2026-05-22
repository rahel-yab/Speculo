from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CreditBalance(BaseModel):
    credits_remaining: int


class CreditHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    delta: int
    reason: str
    created_at: datetime
