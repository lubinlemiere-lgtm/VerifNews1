# ###########################################################################
# # API TTS — Text-To-Speech (lecture audio des articles)
# # GET /tts/{article_id} — Retourne le fichier MP3 (genere ou cache)
# # Parametre lang pour choisir la langue (defaut: en)
# ###########################################################################

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.tts_service import get_or_generate_audio

router = APIRouter(prefix="/tts", tags=["tts"])


@router.get("/{article_id}")
async def get_audio(
    article_id: UUID,
    lang: str = Query("en", max_length=5),
    db: AsyncSession = Depends(get_db),
):
    file_path = await get_or_generate_audio(article_id, db, lang)
    if not file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not available")
    return FileResponse(file_path, media_type="audio/mpeg", filename=f"{article_id}.mp3")
