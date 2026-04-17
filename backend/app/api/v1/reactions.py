# ###########################################################################
# # API Reactions — Like/Dislike sur les articles
# # POST /articles/{id}/reactions — Ajouter/modifier/supprimer une reaction
# # GET /articles/{id}/reactions — Compter les reactions
# # GET /reactions/me — Toutes les reactions de l'utilisateur connecte
# ###########################################################################

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.article import Article
from app.models.reaction import Reaction
from app.models.user import User

router = APIRouter(tags=["reactions"])


class ReactionRequest(BaseModel):
    reaction_type: str  # "like" | "dislike" | "none" (none = supprimer)


class ReactionCountResponse(BaseModel):
    likes: int
    dislikes: int
    user_reaction: str | None = None


class UserReactionResponse(BaseModel):
    article_id: str
    reaction_type: str


# ── POST /articles/{article_id}/reactions ────────────────────────────────
@router.post("/articles/{article_id}/reactions")
async def set_reaction(
    article_id: uuid.UUID,
    data: ReactionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ajouter, modifier ou supprimer une reaction sur un article."""
    if data.reaction_type not in ("like", "dislike", "none"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reaction_type must be 'like', 'dislike', or 'none'",
        )

    # Verifier que l'article existe
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # Chercher la reaction existante
    result = await db.execute(
        select(Reaction).where(
            Reaction.user_id == user.id,
            Reaction.article_id == article_id,
        )
    )
    existing = result.scalar_one_or_none()

    if data.reaction_type == "none":
        # Supprimer la reaction
        if existing:
            await db.delete(existing)
            await db.commit()
        return {"message": "Reaction removed"}

    if existing:
        # Modifier la reaction existante
        existing.reaction_type = data.reaction_type
    else:
        # Creer une nouvelle reaction
        db.add(Reaction(
            user_id=user.id,
            article_id=article_id,
            reaction_type=data.reaction_type,
        ))

    await db.commit()
    return {"message": f"Reaction set to {data.reaction_type}"}


# ── GET /articles/{article_id}/reactions ─────────────────────────────────
@router.get("/articles/{article_id}/reactions", response_model=ReactionCountResponse)
async def get_reactions(
    article_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Compter les likes/dislikes d'un article."""
    likes_q = await db.execute(
        select(func.count()).where(
            Reaction.article_id == article_id,
            Reaction.reaction_type == "like",
        )
    )
    dislikes_q = await db.execute(
        select(func.count()).where(
            Reaction.article_id == article_id,
            Reaction.reaction_type == "dislike",
        )
    )

    return ReactionCountResponse(
        likes=likes_q.scalar_one(),
        dislikes=dislikes_q.scalar_one(),
    )


# ── GET /reactions/me — Toutes les reactions de l'utilisateur ────────────
@router.get("/reactions/me", response_model=list[UserReactionResponse])
async def my_reactions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retourne toutes les reactions de l'utilisateur connecte."""
    result = await db.execute(
        select(Reaction.article_id, Reaction.reaction_type)
        .where(Reaction.user_id == user.id)
        .order_by(Reaction.updated_at.desc())
    )
    return [
        UserReactionResponse(article_id=str(row.article_id), reaction_type=row.reaction_type)
        for row in result.all()
    ]
