# ###########################################################################
# # API Quiz — 2 quiz/semaine (rotation) + culture G mensuel
# # GET /quiz — Liste des quiz disponibles
# # GET /quiz/{id} — Detail quiz avec questions
# # POST /quiz/{id}/submit — Soumission des reponses, calcul score
# # GET /quiz/{id}/leaderboard — Classement d'un quiz
# # GET /quiz/leaderboard/monthly — Classement mensuel agrege
# ###########################################################################

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.quiz import (
    QuizAnswerRequest, QuizOut, QuizResultOut, QuizSummary, LeaderboardOut,
)
from app.services.quiz_service import (
    get_current_quizzes, get_quiz_detail, submit_quiz, get_leaderboard,
)

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.get("", response_model=list[QuizSummary])
async def list_quizzes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all current-week quizzes with play status and winner."""
    return await get_current_quizzes(db, user.id)


@router.get("/leaderboard/monthly", response_model=LeaderboardOut)
async def monthly_leaderboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
):
    """Get aggregated monthly leaderboard (sum of all quiz scores this month)."""
    return await get_leaderboard(db, period="monthly", limit=limit)


@router.get("/{quiz_id}", response_model=QuizOut)
async def quiz_detail(
    quiz_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a quiz with its questions (correct answers hidden)."""
    quiz = await get_quiz_detail(quiz_id, user.id, db)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz


@router.get("/{quiz_id}/leaderboard", response_model=LeaderboardOut)
async def quiz_leaderboard(
    quiz_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=50),
):
    """Get leaderboard for a specific quiz."""
    return await get_leaderboard(db, quiz_id=quiz_id, period="weekly", limit=limit)


@router.post("/{quiz_id}/submit", response_model=QuizResultOut)
async def submit_answers(
    quiz_id: int,
    body: QuizAnswerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit answers for a quiz. Can only play once per quiz."""
    result = await submit_quiz(
        quiz_id, user.id, body.answers, db,
        duration_seconds=body.duration_seconds,
    )
    if result is None:
        raise HTTPException(status_code=400, detail="Quiz already played or not found")
    return result
