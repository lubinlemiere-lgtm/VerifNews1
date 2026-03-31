# ###########################################################################
# # API Auth — Authentification utilisateur
# # POST /auth/register — Inscription
# # POST /auth/login — Connexion (retourne access + refresh token)
# # POST /auth/refresh — Renouvellement token
# # POST /auth/forgot-password — Demande de reset mot de passe (envoie email)
# # POST /auth/reset-password — Reset mot de passe avec token JWT
# # GET /auth/me — Profil utilisateur connecte
# # PUT /auth/password — Changer le mot de passe
# # PUT /auth/profile — Mettre a jour le display_name
# ###########################################################################

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.bookmark import Bookmark
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
)
from app.schemas.user import UserResponse
from app.models.token_blacklist import TokenBlacklist
from app.services.auth_service import login_user, register_user
from app.services.email_service import send_password_reset_email
from app.utils.rate_limiter import auth_limiter
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Utilitaire IP (rate limiting) ──────────────────────────────────────
def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── Inscription et connexion ────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse)
async def register(data: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = _get_client_ip(request)
    if auth_limiter.is_rate_limited(f"register:{ip}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Try again later.")
    return await register_user(data, db)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = _get_client_ip(request)
    if auth_limiter.is_rate_limited(f"login:{ip}"):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts. Try again later.")
    return await login_user(data, db)


# ── Gestion des tokens (refresh, rotation, blacklist) ──────────────────
@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(data.refresh_token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    old_jti = payload.get("jti")
    subject = payload["sub"]

    # Atomically blacklist the old refresh token (rotation).
    # INSERT ... ON CONFLICT DO NOTHING prevents a race condition where
    # two concurrent requests reuse the same refresh token.
    old_exp = payload.get("exp")
    if old_jti and old_exp:
        stmt = pg_insert(TokenBlacklist).values(
            jti=old_jti,
            token_type="refresh",
            expires_at=datetime.fromtimestamp(old_exp, tz=timezone.utc),
        ).on_conflict_do_nothing(index_elements=["jti"])
        result = await db.execute(stmt)
        await db.commit()

        if result.rowcount == 0:
            # Token was already blacklisted by another concurrent request
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has already been used",
            )
    elif old_jti:
        # Token has no exp claim — check manually if already blacklisted
        blacklisted = await db.execute(
            select(TokenBlacklist).where(TokenBlacklist.jti == old_jti)
        )
        if blacklisted.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked",
            )

    return TokenResponse(
        access_token=create_access_token(subject),
        refresh_token=create_refresh_token(subject),
    )


# ── Forgot password ─────────────────────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password reset. Generates a 15-min JWT reset token.
    Always returns 200 to prevent email enumeration attacks.
    Email is sent via email_service (requires SMTP_HOST/SMTP_USER/SMTP_PASSWORD env vars).
    """
    ip = _get_client_ip(request)
    if auth_limiter.is_rate_limited(f"forgot:{ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Try again later.",
        )

    # Look up user by email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if user:
        reset_token = create_reset_token(str(user.id))
        sent = await send_password_reset_email(user.email, reset_token)
        if not sent:
            logger.warning(
                "⚠️ Password reset requested but email NOT sent to %s — "
                "check SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASSWORD). "
                "The user will NOT receive a reset link.",
                user.email,
            )

    # Always return success to prevent email enumeration
    return {"message": "If an account exists with this email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    try:
        payload = decode_token(data.token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    if payload.get("type") != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Password reset successfully. You can now log in."}


# ── Profil utilisateur ──────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.put("/password")
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.display_name = data.display_name
    await db.commit()
    await db.refresh(user)
    return user


# ── Deconnexion et suppression de compte ────────────────────────────────
@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Logout — blacklist the access token and clear push token."""
    # Extract token from header and blacklist it
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                blacklisted = TokenBlacklist(
                    jti=jti,
                    token_type="access",
                    expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
                )
                db.add(blacklisted)
        except Exception:
            pass

    # Clear push token
    current_user.push_token = None
    current_user.push_token_updated_at = None
    db.add(current_user)
    await db.commit()
    return {"message": "Logged out successfully"}


@router.delete("/account")
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete user account and all associated data (GDPR compliance)."""
    # Delete bookmarks
    await db.execute(sa_delete(Bookmark).where(Bookmark.user_id == user.id))
    # Delete the user (cascades to preferences, quiz attempts via FK)
    await db.delete(user)
    await db.commit()
    return {"message": "Account and all data deleted successfully"}


# ── Push token Expo (notifications) ────────────────────────────────────
class PushTokenRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=200)


@router.post("/push-token")
async def update_push_token(
    body: PushTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Store/update the user's Expo push token."""
    token = body.token
    if not token.startswith("ExponentPushToken["):
        raise HTTPException(400, "Invalid push token format")

    current_user.push_token = token
    current_user.push_token_updated_at = datetime.now(timezone.utc)
    db.add(current_user)
    await db.commit()
    return {"status": "ok"}


@router.delete("/push-token")
async def delete_push_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear push token (on logout)."""
    current_user.push_token = None
    current_user.push_token_updated_at = None
    db.add(current_user)
    await db.commit()
    return {"status": "ok"}


# ── Export de donnees (conformite RGPD) ─────────────────────────────────
@router.get("/export")
async def export_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all user data in JSON format (GDPR compliance)."""
    # Bookmarks
    result = await db.execute(
        select(Bookmark.article_id, Bookmark.created_at).where(Bookmark.user_id == user.id)
    )
    bookmarks = [
        {"article_id": str(row.article_id), "saved_at": row.created_at.isoformat()}
        for row in result.all()
    ]

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "country_code": user.country_code,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "bookmarks": bookmarks,
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
