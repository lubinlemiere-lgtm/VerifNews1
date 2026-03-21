# ###########################################################################
# # tts_service.py — Text-To-Speech avec Edge TTS (gratuit)
# # Genere un fichier MP3 a partir du resume d'un article
# # Cache disque: ne regenere pas si le fichier existe deja
# # Supporte multi-langues (en, fr, es, de) via VOICE_MAP
# ###########################################################################

import os
from pathlib import Path
from uuid import UUID

import edge_tts
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.article import Article
from app.models.audio_cache import AudioCache

VOICE_MAP = {
    "en": "en-US-GuyNeural",
    "fr": "fr-FR-HenriNeural",
    "es": "es-ES-AlvaroNeural",
    "de": "de-DE-ConradNeural",
}


async def get_or_generate_audio(article_id: UUID, db: AsyncSession, lang: str = "en") -> str | None:
    """Return path to audio file, generating it if not cached."""
    # Check cache
    result = await db.execute(
        select(AudioCache).where(AudioCache.article_id == article_id, AudioCache.language == lang)
    )
    cached = result.scalar_one_or_none()
    if cached and os.path.exists(cached.file_path):
        return cached.file_path

    # Get article
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article or not article.summary:
        return None

    # Generate audio
    cache_dir = Path(settings.TTS_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    file_path = str(cache_dir / f"{article_id}_{lang}.mp3")

    voice = VOICE_MAP.get(lang, VOICE_MAP["en"])
    communicate = edge_tts.Communicate(article.summary, voice)
    await communicate.save(file_path)

    # Save to cache
    if cached:
        cached.file_path = file_path
    else:
        cache_entry = AudioCache(article_id=article_id, file_path=file_path, language=lang)
        db.add(cache_entry)
    await db.commit()

    return file_path
