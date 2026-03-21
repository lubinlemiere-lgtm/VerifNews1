# ###########################################################################
# # Model Category — Categories de news (politics, tech, sports, etc.)
# # Relations: sources, articles, user_preferences
# ###########################################################################

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    slug = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    icon = Column(String(50))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sources = relationship("Source", back_populates="category")
    articles = relationship("Article", back_populates="category")
    user_preferences = relationship("UserPreference", back_populates="category")
