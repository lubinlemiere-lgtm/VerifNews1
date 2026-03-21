# ###########################################################################
# # Pipeline Dedup — Deduplication par similarite cosinus
# # Compare l'embedding du nouvel article aux existants (meme categorie)
# # Seuil: DEDUP_THRESHOLD (config) — au dessus = doublon rejete
# ###########################################################################

"""Deduplication using cosine similarity on PostgreSQL REAL[] arrays."""

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.utils.vector_ops import embedding_to_pg_array

logger = logging.getLogger(__name__)


async def is_duplicate(embedding: list[float], category_id: int, db: AsyncSession) -> bool:
    """Check if a similar article already exists in the database (last 7 days).

    Uses cosine_similarity SQL function instead of pgvector's <=> operator.
    Deduplication threshold: similarity > (1 - DEDUP_THRESHOLD), e.g. > 0.85.
    """
    pg_array = embedding_to_pg_array(embedding)
    min_similarity = 1.0 - settings.DEDUP_THRESHOLD  # e.g. 1 - 0.15 = 0.85

    query = text("""
        SELECT id FROM articles
        WHERE category_id = :category_id
          AND published_at > NOW() - INTERVAL '7 days'
          AND embedding IS NOT NULL
          AND cosine_similarity(embedding, :emb) > :min_similarity
        LIMIT 1
    """).bindparams(emb=pg_array)

    result = await db.execute(
        query,
        {
            "category_id": category_id,
            "min_similarity": min_similarity,
        },
    )
    duplicate = result.fetchone()
    if duplicate:
        logger.debug(f"Duplicate found for category {category_id}")
        return True
    return False
