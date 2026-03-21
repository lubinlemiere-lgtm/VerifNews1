# ###########################################################################
# # API Articles — Detail article + recherche semantique
# # GET /articles/{id} — Detail complet avec verifications et sources
# # GET /articles/search/ — Recherche semantique par embedding cosinus
# ###########################################################################

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.article import Article
from app.models.verification import Verification
from app.schemas.article import ArticleDetail, ArticleListItem, VerificationInfo
from app.schemas.verification import VerificationResponse
from app.services.embedding_service import generate_embedding, generate_embedding_async
from app.utils.vector_ops import embedding_to_pg_array

router = APIRouter(prefix="/articles", tags=["articles"])


# ── Detail d'un article (avec verifications et sources) ────────────────
@router.get("/{article_id}", response_model=ArticleDetail)
async def get_article(article_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Article)
        .where(Article.id == article_id)
        .options(
            joinedload(Article.category),
            joinedload(Article.primary_source),
            joinedload(Article.verifications).joinedload(Verification.source),
        )
    )
    article = result.scalars().unique().one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    verifications = [
        VerificationInfo(
            source_name=v.source.name if v.source else "Unknown",
            matched_title=v.matched_title,
            matched_url=v.matched_url,
            similarity_score=v.similarity_score,
        )
        for v in article.verifications
    ]

    return ArticleDetail(
        id=article.id,
        title=article.title,
        summary=article.summary,
        content=article.content,
        original_url=article.original_url,
        image_url=article.image_url,
        category_slug=article.category.slug if article.category else None,
        published_at=article.published_at,
        is_verified=article.is_verified,
        verification_count=article.verification_count,
        primary_source=article.primary_source,
        verifications=verifications,
        has_audio=article.audio_url is not None,
    )


# ── Liste des verifications d'un article ───────────────────────────────
@router.get("/{article_id}/verifications", response_model=list[VerificationResponse])
async def get_verifications(article_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Verification)
        .where(Verification.article_id == article_id)
        .options(joinedload(Verification.source))
    )
    verifications = result.scalars().unique().all()
    return [
        VerificationResponse(
            id=v.id,
            source_name=v.source.name if v.source else "Unknown",
            matched_url=v.matched_url,
            matched_title=v.matched_title,
            similarity_score=v.similarity_score,
            verified_at=v.verified_at,
        )
        for v in verifications
    ]


# ── Recherche semantique par embedding cosinus ─────────────────────────
@router.get("/search/", response_model=list[ArticleListItem])
async def search_articles(
    q: str = Query(..., min_length=3),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Semantic search using cosine similarity on embedding arrays."""
    query_embedding = await generate_embedding_async(q)
    pg_array = embedding_to_pg_array(query_embedding)

    result = await db.execute(
        text("""
            SELECT a.id, a.title, a.summary, a.image_url, a.published_at,
                   a.is_verified, a.verification_count, a.audio_url,
                   c.slug as category_slug,
                   cosine_similarity(a.embedding, :emb) AS similarity
            FROM articles a
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE a.embedding IS NOT NULL
              AND a.is_verified = true
            ORDER BY cosine_similarity(a.embedding, :emb) DESC
            LIMIT :limit
        """).bindparams(emb=pg_array),
        {"limit": limit},
    )
    rows = result.fetchall()

    return [
        ArticleListItem(
            id=row.id,
            title=row.title,
            summary=row.summary,
            image_url=row.image_url,
            category_slug=row.category_slug,
            published_at=row.published_at,
            is_verified=row.is_verified,
            verification_count=row.verification_count,
            has_audio=row.audio_url is not None,
        )
        for row in rows
    ]
