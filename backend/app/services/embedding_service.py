# ###########################################################################
# # embedding_service.py — Generation de vecteurs d'embedding
# # Force TF-IDF sur Render free tier (512MB RAM) pour eviter crash OOM
# # Fallback: sentence-transformers si USE_TFIDF_ONLY=false et RAM suffisante
# # LRU cache pour eviter de recalculer les embeddings recents
# # Le TfidfVectorizer est pre-fit sur un vocabulaire fixe (pas re-fit a chaque appel)
# ###########################################################################

import asyncio
import hashlib
import logging
import os
from collections import OrderedDict

from app.config import settings

logger = logging.getLogger(__name__)

_model = None
_use_tfidf = False
_tfidf_vectorizer = None
_tfidf_fitted = False

# ── LRU cache pour les embeddings recents ──────────────────────────────
_CACHE_MAX_SIZE = 256
_embedding_cache: OrderedDict[str, list[float]] = OrderedDict()


def _cache_key(text: str) -> str:
    """Hash court du texte pour cle de cache (evite de stocker le texte entier)."""
    return hashlib.md5(text.encode("utf-8", errors="replace")).hexdigest()


def _cache_get(text: str) -> list[float] | None:
    key = _cache_key(text)
    if key in _embedding_cache:
        _embedding_cache.move_to_end(key)
        return _embedding_cache[key]
    return None


def _cache_set(text: str, embedding: list[float]) -> None:
    key = _cache_key(text)
    _embedding_cache[key] = embedding
    _embedding_cache.move_to_end(key)
    while len(_embedding_cache) > _CACHE_MAX_SIZE:
        _embedding_cache.popitem(last=False)


def _should_force_tfidf() -> bool:
    """Determine si on force TF-IDF (Render free tier, env var, ou config)."""
    # Variable d'env explicite
    env_val = os.environ.get("USE_TFIDF_ONLY", "").lower()
    if env_val in ("1", "true", "yes"):
        return True
    # Render free tier detection: RENDER=true est defini sur Render
    if os.environ.get("RENDER", "").lower() == "true":
        return True
    return getattr(settings, "USE_TFIDF_ONLY", False)


def get_model():
    """Charge le modele d'embedding (lazy loading).
    Force TF-IDF sur Render pour eviter OOM (400MB+ pour sentence-transformers).
    Le vectorizer TF-IDF est cree une seule fois et reutilise."""
    global _model, _use_tfidf, _tfidf_vectorizer

    if _model is not None:
        return _model
    if _use_tfidf and _tfidf_vectorizer is not None:
        return _tfidf_vectorizer

    # Force TF-IDF si Render ou config explicite
    if _should_force_tfidf():
        logger.info("TF-IDF mode forced (Render free tier / USE_TFIDF_ONLY)")
        _use_tfidf = True
        return _get_tfidf_vectorizer()

    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info(f"Embedding model loaded: {settings.EMBEDDING_MODEL}")
        return _model
    except Exception as e:
        logger.warning(f"sentence-transformers unavailable ({e}), using TF-IDF fallback")
        _use_tfidf = True
        return _get_tfidf_vectorizer()


def _get_tfidf_vectorizer():
    """Cree et retourne le TfidfVectorizer (singleton, pre-fit sur un vocabulaire de base)."""
    global _tfidf_vectorizer, _tfidf_fitted
    if _tfidf_vectorizer is not None:
        return _tfidf_vectorizer

    from sklearn.feature_extraction.text import TfidfVectorizer
    _tfidf_vectorizer = TfidfVectorizer(max_features=384)

    # Pre-fit sur un corpus minimal pour avoir un vocabulaire stable
    # Cela evite de refaire fit_transform a chaque appel (instable + lent)
    seed_corpus = [
        "breaking news politics economy government election vote",
        "technology science innovation artificial intelligence computer",
        "sports football basketball tennis olympics championship",
        "entertainment cinema music movies television celebrity",
        "health medicine pandemic vaccine hospital treatment",
        "business finance stock market investment company",
        "climate environment pollution energy sustainability",
        "education university school student research academic",
        "world international conflict peace diplomacy treaty",
        "culture art literature history museum society",
    ]
    _tfidf_vectorizer.fit(seed_corpus)
    _tfidf_fitted = True
    logger.info("TF-IDF vectorizer initialized with seed vocabulary (384 features max)")
    return _tfidf_vectorizer


def generate_embedding(text: str) -> list[float]:
    """Generate a 384-dim embedding vector for the given text (blocking)."""
    global _use_tfidf

    # Check LRU cache first
    cached = _cache_get(text)
    if cached is not None:
        return cached

    model = get_model()

    if _use_tfidf:
        try:
            # transform (pas fit_transform) car le vectorizer est deja fit
            vec = model.transform([text]).toarray()[0]
            result = list(vec[:384])
            while len(result) < 384:
                result.append(0.0)
        except Exception:
            result = [0.0] * 384
    else:
        embedding = model.encode(text, normalize_embeddings=True)
        result = embedding.tolist()

    _cache_set(text, result)
    return result


async def generate_embedding_async(text: str) -> list[float]:
    """Generate embedding without blocking the async event loop."""
    return await asyncio.to_thread(generate_embedding, text)
