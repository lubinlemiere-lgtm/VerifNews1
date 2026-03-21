# ###########################################################################
# # Pipeline Cross-Verifier — Validation par 2+ sources distinctes
# # Compare chaque article aux articles d'autres sources (meme categorie)
# # Si similarite > VERIFICATION_THRESHOLD → article verifie
# ###########################################################################

"""Cross-verification: validates articles using 2+ distinct sources."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.services.verification_service import cross_verify_article

logger = logging.getLogger(__name__)


async def verify_article(article: Article, db: AsyncSession) -> bool:
    """Attempt to cross-verify a newly ingested article."""
    verified = await cross_verify_article(article, db)
    if verified:
        logger.info(f"Article verified: {article.title} ({article.verification_count} sources)")
    return verified
