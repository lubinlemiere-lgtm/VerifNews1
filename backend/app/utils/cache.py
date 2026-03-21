# ###########################################################################
# # cache.py — Cache en memoire simple avec TTL
# # Pas besoin de Redis pour les petites donnees statiques
# ###########################################################################

import time
from typing import Any


class TTLCache:
    """Cache cle-valeur avec expiration automatique."""

    def __init__(self, default_ttl: int = 300):
        self._store: dict[str, tuple[Any, float]] = {}
        self._default_ttl = default_ttl

    def get(self, key: str) -> Any | None:
        """Retourne la valeur ou None si expiree/absente."""
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        """Stocke une valeur avec TTL en secondes."""
        expires_at = time.time() + (ttl or self._default_ttl)
        self._store[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        """Supprime une entree."""
        self._store.pop(key, None)

    def clear(self) -> None:
        """Vide tout le cache."""
        self._store.clear()


# Instances pre-configurees
categories_cache = TTLCache(default_ttl=600)  # 10 min — les categories changent rarement
feed_cache = TTLCache(default_ttl=120)         # 2 min — le feed doit rester frais
