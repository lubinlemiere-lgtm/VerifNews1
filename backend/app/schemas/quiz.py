from datetime import date, datetime

from pydantic import BaseModel


# --- Request ---

class QuizAnswerRequest(BaseModel):
    """User submits answers to a quiz."""
    answers: list[int]  # list of chosen option indices (0-3), one per question
    duration_seconds: int | None = None  # time taken in seconds


# --- Response ---

class QuestionOut(BaseModel):
    id: int
    question: str
    options: list[str]
    difficulty: str  # easy, medium, hard
    fun_fact: str | None = None  # blague/anecdote pour les easy
    sort_order: int

    model_config = {"from_attributes": True}


class QuizOut(BaseModel):
    id: int
    category_slug: str | None
    category_name: str | None
    title: str
    week_start: date
    quiz_type: str  # "weekly" | "monthly"
    question_count: int
    questions: list[QuestionOut]
    already_played: bool = False
    user_score: int | None = None

    model_config = {"from_attributes": True}


class QuizResultOut(BaseModel):
    score: int
    total: int
    correct_indices: list[int]  # reveal correct answers after submission
    duration_seconds: int | None = None


class WinnerOut(BaseModel):
    display_name: str
    score: int
    total: int
    duration_seconds: int | None = None


class QuizSummary(BaseModel):
    """Compact quiz info for the feed card."""
    quiz_id: int
    category_slug: str | None
    category_name: str | None
    title: str
    week_start: date
    quiz_type: str  # "weekly" | "monthly"
    question_count: int
    day_of_week: int | None  # 0=Monday, 3=Thursday
    already_played: bool
    winner: WinnerOut | None = None


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    score: int
    total: int
    duration_seconds: int | None = None


class LeaderboardOut(BaseModel):
    quiz_id: int | None = None
    period: str  # "weekly" | "monthly"
    entries: list[LeaderboardEntry]
