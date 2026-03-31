# ###########################################################################
# # Model User — Utilisateur avec email, password hash, country_code
# # Relation: preferences (categories abonnees)
# ###########################################################################

import uuid

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(100))
    country_code = Column(String(5), default="US")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    push_token = Column(String, nullable=True)
    push_token_updated_at = Column(DateTime, nullable=True)

    # Preferences de notification globales (synchro frontend → backend)
    notify_breaking_news = Column(Boolean, default=True, server_default="true")
    notify_daily_digest = Column(Boolean, default=True, server_default="true")
    notify_quiz_reminders = Column(Boolean, default=False, server_default="false")
    notify_category_alerts = Column(Boolean, default=True, server_default="true")

    preferences = relationship("UserPreference", back_populates="user", cascade="all, delete-orphan")
