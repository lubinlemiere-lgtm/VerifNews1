# ###########################################################################
# # Model Bookmark — Favoris utilisateur (article sauvegarde)
# # Contrainte unique: un user ne peut bookmarker un article qu'une fois
# ###########################################################################

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="bookmarks")
    article = relationship("Article", backref="bookmarks")

    __table_args__ = (
        UniqueConstraint("user_id", "article_id", name="uq_user_article_bookmark"),
    )
