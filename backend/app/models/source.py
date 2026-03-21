# ###########################################################################
# # Model Source — Sources RSS/API avec fiabilite (tier 1-3) et country_code
# # Le country_code est propage vers chaque article ingere
# ###########################################################################

from sqlalchemy import Column, Integer, String, Boolean, SmallInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    url = Column(String(500), nullable=False)
    source_type = Column(String(20), nullable=False)  # rss, api, scraper
    reliability_tier = Column(SmallInteger, default=1)  # 1=primary, 2=agency, 3=reputable
    category_id = Column(Integer, ForeignKey("categories.id"))
    country_code = Column(String(5))
    is_active = Column(Boolean, default=True)
    last_fetched_at = Column(DateTime(timezone=True))
    fetch_interval_minutes = Column(Integer, default=30)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="sources")
    verifications = relationship("Verification", back_populates="source")
