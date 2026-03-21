# ###########################################################################
# # dependencies.py — Injection de dependances FastAPI
# # Authentification JWT, extraction user depuis token Bearer
# ###########################################################################

from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.token_blacklist import TokenBlacklist
from app.models.user import User
from app.utils.security import decode_token

security = HTTPBearer()


# ── Extraction et validation du user depuis le token Bearer ────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Check if token has been revoked (blacklisted)
    jti = payload.get("jti")
    if jti:
        blacklisted = await db.execute(
            select(TokenBlacklist).where(TokenBlacklist.jti == jti)
        )
        if blacklisted.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
