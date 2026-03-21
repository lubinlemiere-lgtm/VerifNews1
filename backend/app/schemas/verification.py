from datetime import datetime

from pydantic import BaseModel


class VerificationResponse(BaseModel):
    id: int
    source_name: str
    matched_url: str | None
    matched_title: str | None
    similarity_score: float | None
    verified_at: datetime

    model_config = {"from_attributes": True}
