# ###########################################################################
# # tts_service.py — Text-To-Speech avec Edge TTS (gratuit)
# # Genere un fichier MP3 a partir du contenu complet d'un article
# # Fallback sur le resume si le contenu est vide
# # Cache disque: ne regenere pas si le fichier existe deja
# # Supporte multi-langues (en, fr, es, de) via VOICE_MAP
# # Voix naturelles / conversationnelles (Multilingual Neural)
# # Optimise: nettoyage texte, troncature 5000 chars, async natif
# ###########################################################################

import os
import re
from pathlib import Path
from uuid import UUID

import edge_tts
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.article import Article
from app.models.audio_cache import AudioCache

# Voix les plus naturelles disponibles avec Edge TTS
VOICE_MAP = {
    "en": "en-US-AvaMultilingualNeural",
    "fr": "fr-FR-VivienneMultilingualNeural",
    "es": "es-ES-ElviraNeural",
    "de": "de-DE-SeraphinaMultilingualNeural",
}

# Mapping vitesse utilisateur -> format Edge TTS
# 0.75x = -25%, 1.0x = +0%, 1.25x = +25%, 1.5x = +50%
RATE_MAP: dict[float, str] = {
    0.75: "-25%",
    1.0: "+0%",
    1.25: "+25%",
    1.5: "+50%",
}

# Longueur max du texte pour TTS (evite les generations tres longues)
MAX_TTS_CHARS = 5000


def _clean_text_for_tts(text: str) -> str:
    """Nettoie le texte avant la synthese vocale.
    Retire URLs, markdown, balises HTML, et caracteres speciaux."""
    # Retirer les balises HTML
    text = re.sub(r"<[^>]+>", " ", text)
    # Retirer les URLs
    text = re.sub(r"https?://\S+", "", text)
    # Retirer la syntaxe markdown (gras, italique, liens, images)
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)  # images
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)  # liens -> texte
    text = re.sub(r"[*_~`#]+", "", text)  # formatage markdown
    # Retirer les caracteres speciaux qui perturbent le TTS
    text = re.sub(r"[•●▪▸►]", "", text)
    # Normaliser les espaces multiples
    text = re.sub(r"\s+", " ", text).strip()
    # Tronquer a MAX_TTS_CHARS (couper au dernier point/phrase complete)
    if len(text) > MAX_TTS_CHARS:
        truncated = text[:MAX_TTS_CHARS]
        # Chercher le dernier point pour couper proprement
        last_period = truncated.rfind(".")
        if last_period > MAX_TTS_CHARS * 0.7:  # au moins 70% du texte
            text = truncated[: last_period + 1]
        else:
            text = truncated
    return text


async def get_or_generate_audio(
    article_id: UUID,
    db: AsyncSession,
    lang: str = "en",
    rate: float = 1.0,
) -> str | None:
    """Return path to audio file, generating it if not cached.

    Lit le contenu complet de l'article (article.content).
    Si le contenu est vide, utilise le resume (article.summary) en fallback.
    Le parametre rate controle la vitesse de lecture (0.75, 1.0, 1.25, 1.5).
    """
    # Normaliser le rate pour le nom de fichier cache
    rate_key = str(rate).replace(".", "_")

    # Check cache (inclut le rate dans la cle pour eviter les collisions)
    result = await db.execute(
        select(AudioCache).where(
            AudioCache.article_id == article_id,
            AudioCache.language == f"{lang}_r{rate_key}",
        )
    )
    cached = result.scalar_one_or_none()
    if cached and os.path.exists(cached.file_path):
        return cached.file_path

    # Get article
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        return None

    # Utiliser le contenu complet, fallback sur le resume
    text = article.content if article.content else article.summary
    if not text:
        return None

    # Nettoyer et tronquer le texte
    text = _clean_text_for_tts(text)
    if not text:
        return None

    # Generate audio (edge_tts est deja async, pas de to_thread necessaire)
    cache_dir = Path(settings.TTS_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)
    file_path = str(cache_dir / f"{article_id}_{lang}_r{rate_key}.mp3")

    voice = VOICE_MAP.get(lang, VOICE_MAP["en"])
    edge_rate = RATE_MAP.get(rate, "+0%")
    communicate = edge_tts.Communicate(text, voice, rate=edge_rate)
    await communicate.save(file_path)

    # Save to cache (language inclut le rate pour unicite)
    if cached:
        cached.file_path = file_path
    else:
        cache_entry = AudioCache(
            article_id=article_id,
            file_path=file_path,
            language=f"{lang}_r{rate_key}",
        )
        db.add(cache_entry)
    await db.commit()

    return file_path
