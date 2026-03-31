# ###########################################################################
# # Service Verification — Cross-verification par similarite cosinus
# # re_verify_pending(): re-verifie les articles non verifies
# # Seuil: VERIFICATION_THRESHOLD (config), MIN_VERIFICATION_SOURCES
# ###########################################################################

import logging
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.article import Article
from app.models.verification import Verification
from app.utils.vector_ops import embedding_to_pg_array

logger = logging.getLogger(__name__)


async def cross_verify_article(article: Article, db: AsyncSession) -> bool:
    """
    Check if an article can be verified by finding similar articles
    from different sources within a 48h window.
    Returns True if the article was verified (2+ distinct sources).

    Uses cosine_similarity SQL function on REAL[] arrays instead of pgvector.
    """
    if article.embedding is None:
        return False

    try:
        pg_array = embedding_to_pg_array(article.embedding)

        # Find similar articles from different sources
        query = text("""
            SELECT a.id, a.title, a.original_url, a.primary_source_id,
                   cosine_similarity(a.embedding, :emb) AS similarity
            FROM articles a
            WHERE a.id != :article_id
              AND a.category_id = :category_id
              AND a.primary_source_id != :source_id
              AND a.published_at > NOW() - INTERVAL '48 hours'
              AND a.embedding IS NOT NULL
              AND cosine_similarity(a.embedding, :emb) > :threshold
            ORDER BY similarity DESC
            LIMIT 10
        """).bindparams(emb=pg_array)

        result = await db.execute(
            query,
            {
                "article_id": str(article.id),
                "category_id": article.category_id,
                "source_id": article.primary_source_id,
                "threshold": settings.VERIFICATION_THRESHOLD,
            },
        )
        matches = result.fetchall()

        # Count distinct sources
        distinct_sources: dict[int, tuple] = {}
        for match in matches:
            source_id = match.primary_source_id
            if source_id not in distinct_sources:
                distinct_sources[source_id] = match

        if len(distinct_sources) >= settings.MIN_VERIFICATION_SOURCES:
            # Check for existing verifications to avoid duplicates
            existing = await db.execute(
                select(Verification.source_id).where(Verification.article_id == article.id)
            )
            existing_source_ids = {row[0] for row in existing.all()}

            # Create verification records only for new sources
            new_verifications = 0
            for source_id, match in distinct_sources.items():
                if source_id in existing_source_ids:
                    continue
                verification = Verification(
                    article_id=article.id,
                    source_id=source_id,
                    matched_url=match.original_url,
                    matched_title=match.title,
                    similarity_score=match.similarity,
                )
                db.add(verification)
                new_verifications += 1

            article.is_verified = True
            article.verification_count = len(distinct_sources) + 1  # +1 for the article's own source
            await db.commit()

            if new_verifications > 0:
                logger.info(
                    f"Verified: '{article.title[:60]}' with {article.verification_count} sources"
                )
            return True

    except Exception as e:
        logger.error(f"Verification error for article {article.id}: {e}")
        await db.rollback()

    return False


async def re_verify_pending(db: AsyncSession) -> int:
    """Re-check unverified articles from the last 48h. Returns count of newly verified."""
    try:
        query = select(Article).where(
            Article.is_verified.is_(False),
            Article.embedding.isnot(None),
            Article.published_at > text("NOW() - INTERVAL '48 hours'"),
        )
        result = await db.execute(query)
        unverified = result.scalars().all()

        verified_count = 0
        for article in unverified:
            if await cross_verify_article(article, db):
                verified_count += 1

        if verified_count > 0:
            logger.info(f"Re-verification: {verified_count}/{len(unverified)} articles newly verified")
        return verified_count

    except Exception as e:
        logger.error(f"Re-verification failed: {e}")
        return 0
