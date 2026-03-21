from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.category import Category
from app.models.source import Source
from app.schemas.category import CategoryResponse
from app.schemas.source import SourceResponse
from app.utils.cache import categories_cache

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    cached = categories_cache.get("all_categories")
    if cached is not None:
        return cached

    result = await db.execute(select(Category).order_by(Category.id))
    categories = result.scalars().all()
    categories_cache.set("all_categories", categories)
    return categories


@router.get("/{slug}/sources", response_model=list[SourceResponse])
async def list_category_sources(slug: str, db: AsyncSession = Depends(get_db)):
    cache_key = f"sources:{slug}"
    cached = categories_cache.get(cache_key)
    if cached is not None:
        return cached

    result = await db.execute(
        select(Source)
        .join(Category)
        .where(Category.slug == slug, Source.is_active.is_(True))
        .order_by(Source.reliability_tier)
    )
    sources = result.scalars().all()
    categories_cache.set(cache_key, sources)
    return sources
