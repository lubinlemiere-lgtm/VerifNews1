from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.source import SourceResponse


class VerificationInfo(BaseModel):
    source_name: str
    matched_title: str | None
    matched_url: str | None
    similarity_score: float | None

    model_config = {"from_attributes": True}


class ArticleListItem(BaseModel):
    id: UUID
    title: str
    summary: str | None
    image_url: str | None
    category_slug: str | None
    published_at: datetime | None
    is_verified: bool
    verification_count: int
    has_audio: bool = False

    model_config = {"from_attributes": True}


class ArticleDetail(BaseModel):
    id: UUID
    title: str
    summary: str | None
    content: str | None
    original_url: str | None
    image_url: str | None
    category_slug: str | None
    published_at: datetime | None
    is_verified: bool
    verification_count: int
    primary_source: SourceResponse | None
    verifications: list[VerificationInfo]
    has_audio: bool = False

    model_config = {"from_attributes": True}


class PaginatedArticles(BaseModel):
    items: list[ArticleListItem]
    total: int
    page: int
    page_size: int
    has_next: bool
