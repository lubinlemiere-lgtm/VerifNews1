# ###########################################################################
# # Service Auth — Logique inscription et connexion
# # register_user(): hash password, cree user, retourne tokens
# # login_user(): verifie credentials, retourne access + refresh tokens
# ###########################################################################

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)


async def register_user(data: RegisterRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        display_name=data.display_name,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


async def login_user(data: LoginRequest, db: AsyncSession) -> TokenResponse:
    result = await db.execute(
        select(User).where(User.email == data.email, User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )
