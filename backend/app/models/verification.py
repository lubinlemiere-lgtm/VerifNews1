# ###########################################################################
# # Model Verification — Lien article <-> source pour cross-verification
# # Stocke le score de similarite et le titre/URL correspondant
# ###########################################################################

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(Integer, ForeignKey("sources.id"))
    matched_url = Column(String(1000))
    matched_title = Column(String(500))
    similarity_score = Column(Float)
    verified_at = Column(DateTime(timezone=True), server_default=func.now())

    article = relationship("Article", back_populates="verifications")
    source = relationship("Source", back_populates="verifications")
