# ###########################################################################
# # embedding_service.py — Generation de vecteurs d'embedding
# # Utilise sentence-transformers (all-MiniLM-L6-v2, 384 dimensions)
# # Singleton du modele pour eviter de le recharger a chaque appel
# # Version async via asyncio.to_thread() pour ne pas bloquer l'event loop
# # Fallback TF-IDF si sentence-transformers n'est pas disponible (RAM limitee)
# ###########################################################################

import asyncio
import logging

from app.config import settings

logger = logging.getLogger(__name__)

_model = None
_use_tfidf = False
_tfidf_vectorizer = None


def get_model():
    """Charge le modele d'embedding (lazy loading).
    Fallback vers TF-IDF si sentence-transformers n'est pas dispo."""
    global _model, _use_tfidf, _tfidf_vectorizer

    if _model is not None:
        return _model
    if _use_tfidf and _tfidf_vectorizer is not None:
        return _tfidf_vectorizer

    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info(f"Embedding model loaded: {settings.EMBEDDING_MODEL}")
        return _model
    except Exception as e:
        logger.warning(f"sentence-transformers unavailable ({e}), using TF-IDF fallback")
        _use_tfidf = True
        from sklearn.feature_extraction.text import TfidfVectorizer
        _tfidf_vectorizer = TfidfVectorizer(max_features=384)
        return _tfidf_vectorizer


def generate_embedding(text: str) -> list[float]:
    """Generate a 384-dim embedding vector for the given text (blocking)."""
    global _use_tfidf

    model = get_model()

    if _use_tfidf:
        # TF-IDF fallback: genere un vecteur de taille 384
        try:
            vec = model.fit_transform([text]).toarray()[0]
            # Pad ou tronque a 384 dimensions
            result = list(vec[:384])
            while len(result) < 384:
                result.append(0.0)
            return result
        except Exception:
            return [0.0] * 384
    else:
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()


async def generate_embedding_async(text: str) -> list[float]:
    """Generate embedding without blocking the async event loop."""
    return await asyncio.to_thread(generate_embedding, text)
