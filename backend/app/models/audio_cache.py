# ###########################################################################
# # audio_cache.py — Cache audio TTS (Text-To-Speech)
# # Stocke le chemin du fichier MP3 genere par Edge TTS
# # Un enregistrement par article+langue, evite de regenerer l'audio
# ###########################################################################

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class AudioCache(Base):
    __tablename__ = "audio_cache"

    id = Column(Integer, primary_key=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), unique=True, nullable=False)
    file_path = Column(String(500), nullable=False)
    language = Column(String(10), default="en")
    duration_seconds = Column(Integer)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    article = relationship("Article", back_populates="audio_cache")
