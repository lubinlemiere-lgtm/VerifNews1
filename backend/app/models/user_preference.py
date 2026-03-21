# ###########################################################################
# # user_preference.py — Preferences utilisateur par categorie
# # Lie un user a une categorie avec abonnement + notifications
# # Contrainte unique (user_id, category_id) — 1 pref par categorie
# ###########################################################################

from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    is_subscribed = Column(Boolean, default=True)
    notification_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "category_id"),)

    user = relationship("User", back_populates="preferences")
    category = relationship("Category", back_populates="user_preferences")
