# ###########################################################################
# # Reaction — Like/Dislike sur un article
# # Un utilisateur peut avoir une seule reaction par article
# ###########################################################################

import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint("user_id", "article_id", name="uq_user_article_reaction"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    reaction_type = Column(String(10), nullable=False)  # "like" or "dislike"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="reactions")
    article = relationship("Article", backref="reactions")
