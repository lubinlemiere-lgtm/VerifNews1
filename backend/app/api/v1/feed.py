# ###########################################################################
# # API Feed — Endpoints du flux d'articles
# # GET /feed — Feed personnalise (auth requise, categories abonnees)
# # GET /feed/latest — Derniers articles (public, cache 60s)
# # GET /feed/top — Top articles par periode (public, cache 120s)
# ###########################################################################

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.article import PaginatedArticles
from app.services.feed_service import get_latest_feed, get_personalized_feed, get_top_articles
from app.utils.cache import feed_cache

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=PaginatedArticles)
async def feed(
    page: int = Query(1, ge=1, le=100),
    limit: int = Query(20, ge=1, le=50),
    category: str | None = None,
    country: str | None = None,
    verified_only: bool = True,
    country_priority: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_personalized_feed(
        user_id=user.id,
        db=db,
        page=page,
        page_size=limit,
        category_slug=category,
        country_code=country,
        verified_only=verified_only,
        country_priority=country_priority,
    )


@router.get("/latest", response_model=PaginatedArticles)
async def latest_feed(
    page: int = Query(1, ge=1, le=100),
    limit: int = Query(15, ge=1, le=50),
    category: str | None = None,
    country: str | None = None,
    country_priority: bool = False,
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"latest:{page}:{limit}:{category}:{country}:{country_priority}"
    cached = feed_cache.get(cache_key)
    if cached is not None:
        return cached

    result = await get_latest_feed(
        db=db,
        page=page,
        page_size=limit,
        category_slug=category,
        country_code=country,
        country_priority=country_priority,
    )
    feed_cache.set(cache_key, result, ttl=60)
    return result


@router.get("/top", response_model=PaginatedArticles)
async def top_feed(
    period: str = Query("month", pattern="^(day|week|month|year)$"),
    category: str | None = None,
    page: int = Query(1, ge=1, le=100),
    limit: int = Query(15, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Top verified articles ranked by likes, verification count, then recency."""
    cache_key = f"top:{period}:{category}:{page}:{limit}"
    cached = feed_cache.get(cache_key)
    if cached is not None:
        return cached

    result = await get_top_articles(
        db=db,
        period=period,
        category_slug=category,
        page=page,
        page_size=limit,
    )
    feed_cache.set(cache_key, result, ttl=120)
    return result
