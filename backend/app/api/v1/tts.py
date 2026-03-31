# ###########################################################################
# # API TTS — Text-To-Speech (lecture audio des articles)
# # GET /tts/{article_id} — Retourne le fichier MP3 (genere ou cache)
# # Parametre lang pour choisir la langue (defaut: en)
# ###########################################################################

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.tts_service import get_or_generate_audio
from app.utils.rate_limiter import tts_limiter

router = APIRouter(prefix="/tts", tags=["tts"])


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("/{article_id}")
async def get_audio(
    request: Request,
    article_id: UUID,
    lang: str = Query("en", max_length=5),
    rate: float = Query(1.0, ge=0.5, le=2.0),
    db: AsyncSession = Depends(get_db),
):
    ip = _get_client_ip(request)
    if tts_limiter.is_rate_limited(f"tts:{ip}"):
        raise HTTPException(status_code=429, detail="Too many audio requests, try again later")
    file_path = await get_or_generate_audio(article_id, db, lang, rate=rate)
    if not file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audio not available")
    return FileResponse(file_path, media_type="audio/mpeg", filename=f"{article_id}.mp3")
