# ###########################################################################
# # Pipeline NLP — Embeddings + resumes extractifs
# # Utilise sentence-transformers (all-MiniLM-L6-v2, 384 dim)
# # Genere un vecteur par article pour recherche semantique + dedup
# ###########################################################################

"""NLP processing: embeddings and extractive summarization."""

import logging

from app.pipeline.ingestion import RawArticle
from app.services.embedding_service import generate_embedding
from app.utils.text_processing import extractive_summary

logger = logging.getLogger(__name__)


def process_articles(articles: list[RawArticle]) -> list[tuple[RawArticle, list[float], str]]:
    """
    Generate embeddings and summaries for each article.
    Returns list of (article, embedding, summary) tuples.
    """
    results = []
    for article in articles:
        try:
            # Combine title + content for embedding (title weighted by repetition)
            embed_text = f"{article.title}. {article.title}. {article.content[:500]}"
            embedding = generate_embedding(embed_text)

            summary = extractive_summary(article.content, num_sentences=3)

            results.append((article, embedding, summary))
        except Exception as e:
            logger.error(f"NLP error for '{article.title}': {e}")

    logger.info(f"NLP processed {len(results)}/{len(articles)} articles")
    return results
