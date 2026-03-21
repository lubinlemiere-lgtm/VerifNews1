# ###########################################################################
# # token_blacklist.py — Tokens JWT revoques (blacklist)
# # Stocke les JTI des tokens invalides apres logout ou rotation refresh
# # Verifie dans dependencies.py avant chaque requete authentifiee
# ###########################################################################

"""Blacklisted JWT tokens — revoked on logout or refresh rotation."""

from sqlalchemy import Column, DateTime, Integer, String, func
from app.database import Base


class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    jti = Column(String, unique=True, nullable=False, index=True)
    token_type = Column(String(20), nullable=False)  # "access" or "refresh"
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
