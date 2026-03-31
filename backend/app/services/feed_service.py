# ###########################################################################
# # Service Feed — Requetes SQL avec ranking intelligent
# # Ranking: verifie > recence > engagement > image
# # Fonctions: get_personalized_feed, get_latest_feed, get_top_articles
# # country_priority: tri pays choisi en premier (pas de filtre dur)
# ###########################################################################

from uuid import UUID

from sqlalchemy import select, func, case, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.article import Article
from app.models.category import Category
from app.models.reaction import Reaction
from app.models.user_preference import UserPreference
from app.schemas.article import ArticleListItem, PaginatedArticles


def _build_ranking_order():
    """Smart ranking: verified first, then recency, then engagement signals."""
    verified_boost = case(
        (Article.is_verified.is_(True), 100.0),
        else_=0.0,
    )
    verification_score = func.coalesce(Article.verification_count, 0) * 10.0
    hours_age = func.extract("epoch", func.now() - Article.published_at) / 3600.0
    recency_score = func.greatest(0.0, 72.0 - func.least(hours_age, 72.0))
    image_bonus = case(
        (Article.image_url.isnot(None), 5.0),
        else_=0.0,
    )
    return (verified_boost + verification_score + recency_score + image_bonus).desc()


def _build_top_ranking():
    """Ranking for top news: likes > verification_count > recency."""
    # like_count is added via a subquery label — see get_top_articles()
    # Here we build the secondary/tertiary tiebreakers only.
    verification_score = func.coalesce(Article.verification_count, 0) * 20.0
    image_bonus = case(
        (Article.image_url.isnot(None), 3.0),
        else_=0.0,
    )
    return (verification_score + image_bonus).desc()


def _article_to_item(a: Article) -> ArticleListItem:
    return ArticleListItem(
        id=a.id,
        title=a.title,
        summary=a.summary,
        image_url=a.image_url,
        category_slug=a.category.slug if a.category else None,
        published_at=a.published_at,
        is_verified=a.is_verified,
        verification_count=a.verification_count,
        has_audio=a.audio_url is not None,
    )


async def get_personalized_feed(
    user_id: UUID,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 15,
    category_slug: str | None = None,
    country_code: str | None = None,
    verified_only: bool = True,
    country_priority: bool = False,
) -> PaginatedArticles:
    prefs_q = select(UserPreference.category_id).where(
        UserPreference.user_id == user_id,
        UserPreference.is_subscribed.is_(True),
    )
    result = await db.execute(prefs_q)
    subscribed_ids = [r[0] for r in result.all()]

    query = select(Article).join(Category)
    if subscribed_ids:
        query = query.where(Article.category_id.in_(subscribed_ids))
    if category_slug:
        query = query.where(Category.slug == category_slug)
    if country_code and not country_priority:
        # Hard filter: only this country
        query = query.where(Article.country_code == country_code)
    if verified_only:
        query = query.where(Article.is_verified.is_(True))

    query = query.where(Article.published_at > text("NOW() - INTERVAL '7 days'"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Country priority: chosen country first, then others
    order_clauses = []
    if country_priority and country_code:
        country_boost = case(
            (Article.country_code == country_code, 1),
            else_=0,
        ).desc()
        order_clauses.append(country_boost)
    order_clauses.append(_build_ranking_order())

    query = (
        query.order_by(*order_clauses)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query.options(joinedload(Article.category)))
    articles = result.scalars().unique().all()

    return PaginatedArticles(
        items=[_article_to_item(a) for a in articles],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


async def get_latest_feed(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 15,
    verified_only: bool = True,
    category_slug: str | None = None,
    country_code: str | None = None,
    country_priority: bool = False,
) -> PaginatedArticles:
    query = select(Article).join(Category)
    if verified_only:
        query = query.where(Article.is_verified.is_(True))
    if category_slug:
        query = query.where(Category.slug == category_slug)

    query = query.where(Article.published_at > text("NOW() - INTERVAL '7 days'"))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Country priority: chosen country first, then others
    order_clauses = []
    if country_priority and country_code:
        country_boost = case(
            (Article.country_code == country_code, 1),
            else_=0,
        ).desc()
        order_clauses.append(country_boost)
    order_clauses.append(_build_ranking_order())

    query = (
        query.options(joinedload(Article.category))
        .order_by(*order_clauses)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    articles = result.scalars().unique().all()

    return PaginatedArticles(
        items=[_article_to_item(a) for a in articles],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )


async def get_top_articles(
    db: AsyncSession,
    period: str = "month",
    category_slug: str | None = None,
    page: int = 1,
    page_size: int = 15,
) -> PaginatedArticles:
    """Top verified articles ranked by engagement.
    Ranking: like_count (DESC) > verification_count (DESC) > published_at (DESC).
    Periods: day (24h), week (7d), month (30d), year (365d).
    """
    # Subquery: count likes per article
    like_count_sq = (
        select(
            Reaction.article_id,
            func.count(Reaction.id).label("like_count"),
        )
        .where(Reaction.reaction_type == "like")
        .group_by(Reaction.article_id)
        .subquery()
    )

    query = (
        select(Article, func.coalesce(like_count_sq.c.like_count, 0).label("like_count"))
        .join(Category)
        .outerjoin(like_count_sq, Article.id == like_count_sq.c.article_id)
    )
    query = query.where(Article.is_verified.is_(True))

    # Period filter
    period_intervals = {
        "day": "1 day",
        "week": "7 days",
        "month": "30 days",
        "year": "365 days",
    }
    interval = period_intervals.get(period, "30 days")
    query = query.where(Article.published_at > text(f"NOW() - INTERVAL '{interval}'"))

    if category_slug:
        query = query.where(Category.slug == category_slug)

    # Count total (without like join for efficiency)
    count_base = select(Article).join(Category).where(Article.is_verified.is_(True))
    count_base = count_base.where(Article.published_at > text(f"NOW() - INTERVAL '{interval}'"))
    if category_slug:
        count_base = count_base.where(Category.slug == category_slug)
    count_q = select(func.count()).select_from(count_base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Order: likes DESC > verification_count DESC > recency DESC
    query = (
        query.options(joinedload(Article.category))
        .order_by(
            func.coalesce(like_count_sq.c.like_count, 0).desc(),
            func.coalesce(Article.verification_count, 0).desc(),
            Article.published_at.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    rows = result.unique().all()
    articles = [row[0] for row in rows]

    return PaginatedArticles(
        items=[_article_to_item(a) for a in articles],
        total=total, page=page, page_size=page_size,
        has_next=(page * page_size) < total,
    )
