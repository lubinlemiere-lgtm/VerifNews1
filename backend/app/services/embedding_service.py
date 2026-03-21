# ###########################################################################
# # embedding_service.py — Generation de vecteurs d'embedding
# # Utilise sentence-transformers (all-MiniLM-L6-v2, 384 dimensions)
# # Singleton du modele pour eviter de le recharger a chaque appel
# # Version async via asyncio.to_thread() pour ne pas bloquer l'event loop
# ###########################################################################

import asyncio

from sentence_transformers import SentenceTransformer

from app.config import settings

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def generate_embedding(text: str) -> list[float]:
    """Generate a 384-dim embedding vector for the given text (blocking)."""
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


async def generate_embedding_async(text: str) -> list[float]:
    """Generate embedding without blocking the async event loop.

    Wraps the synchronous model.encode() call in asyncio.to_thread()
    so it runs in a thread pool instead of blocking the event loop.
    """
    return await asyncio.to_thread(generate_embedding, text)
