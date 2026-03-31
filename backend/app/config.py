# ###########################################################################
# # config.py — Configuration globale
# # Variables d'env (.env), secrets JWT, seuils NLP, intervalles pipeline
# ###########################################################################

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Base de donnees ────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://verifnews:verifnews@localhost:5432/verifnews"

    # ── Authentification JWT ───────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 30
    JWT_REFRESH_EXPIRATION_DAYS: int = 7

    # ── Cles API externes ─────────────────────────────────────────────
    NEWSAPI_KEY: str = ""
    TMDB_API_KEY: str = ""

    # ── TTS et embeddings ─────────────────────────────────────────────
    TTS_CACHE_DIR: str = "./audio_cache"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    USE_TFIDF_ONLY: bool = True  # True par defaut pour Render 512MB (sentence-transformers ~400MB)

    # ── Seuils NLP (verification croisee et deduplication) ─────────────
    VERIFICATION_THRESHOLD: float = 0.75
    DEDUP_THRESHOLD: float = 0.15
    MIN_VERIFICATION_SOURCES: int = 2

    # ── Pipeline d'ingestion ──────────────────────────────────────────
    PIPELINE_INTERVAL_MINUTES: int = 30

    # ── Email SMTP (reset mot de passe) ───────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@verifnews.app"
    SMTP_FROM_NAME: str = "VerifNews"
    APP_FRONTEND_URL: str = "https://verifnews.app"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
