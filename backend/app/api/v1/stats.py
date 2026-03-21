# ###########################################################################
# # API Stats — Statistiques utilisateur
# # GET /stats/me — Stats globales de l'utilisateur connecte
# ###########################################################################

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.bookmark import Bookmark
from app.models.quiz import QuizAttempt
from app.models.reaction import Reaction
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["stats"])


class UserStatsResponse(BaseModel):
    total_bookmarks: int
    total_likes: int
    total_dislikes: int
    quizzes_played: int
    quizzes_avg_score: float | None
    quizzes_best_score: int | None
    member_since: str | None


@router.get("/me", response_model=UserStatsResponse)
async def my_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retourne les statistiques globales de l'utilisateur."""

    # Bookmarks
    bk = await db.execute(
        select(func.count()).where(Bookmark.user_id == user.id)
    )
    total_bookmarks = bk.scalar_one()

    # Reactions
    likes = await db.execute(
        select(func.count()).where(
            Reaction.user_id == user.id, Reaction.reaction_type == "like"
        )
    )
    dislikes = await db.execute(
        select(func.count()).where(
            Reaction.user_id == user.id, Reaction.reaction_type == "dislike"
        )
    )

    # Quiz attempts
    quiz_q = await db.execute(
        select(
            func.count().label("count"),
            func.avg(QuizAttempt.score).label("avg_score"),
            func.max(QuizAttempt.score).label("best_score"),
        ).where(QuizAttempt.user_id == user.id)
    )
    quiz_row = quiz_q.one()

    return UserStatsResponse(
        total_bookmarks=total_bookmarks,
        total_likes=likes.scalar_one(),
        total_dislikes=dislikes.scalar_one(),
        quizzes_played=quiz_row.count,
        quizzes_avg_score=round(float(quiz_row.avg_score), 1) if quiz_row.avg_score else None,
        quizzes_best_score=quiz_row.best_score,
        member_since=user.created_at.isoformat() if user.created_at else None,
    )
