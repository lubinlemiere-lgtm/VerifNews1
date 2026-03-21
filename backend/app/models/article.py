# ###########################################################################
# # Model Article — Table principale des articles
# # Champs cles: embedding (384-dim), is_verified, verification_count,
# #   country_code (herite de la source), category_id
# ###########################################################################

import uuid

from sqlalchemy import Column, Integer, String, Text, Boolean, SmallInteger, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy import Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Article(Base):
    __tablename__ = "articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    summary = Column(Text)
    content = Column(Text)
    original_url = Column(String(1000))
    image_url = Column(String(1000))
    category_id = Column(Integer, ForeignKey("categories.id"))
    primary_source_id = Column(Integer, ForeignKey("sources.id"))
    published_at = Column(DateTime(timezone=True))
    ingested_at = Column(DateTime(timezone=True), server_default=func.now())
    embedding = Column(ARRAY(Float))  # 384-dim float array (replaces pgvector Vector)
    is_verified = Column(Boolean, default=False)
    verification_count = Column(SmallInteger, default=0)
    audio_url = Column(String(500))
    country_code = Column(String(5))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="articles")
    primary_source = relationship("Source")
    verifications = relationship("Verification", back_populates="article", cascade="all, delete-orphan")
    audio_cache = relationship("AudioCache", back_populates="article", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_articles_category", "category_id"),
        Index("idx_articles_verified", "is_verified"),
        Index("idx_articles_published", published_at.desc()),
        Index("idx_articles_country", "country_code"),
    )
