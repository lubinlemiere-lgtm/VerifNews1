# ###########################################################################
# # Models Quiz — Quiz hebdomadaire (2/semaine) + mensuel culture G
# # Quiz: rotation 2 categories/semaine + 1 culture G/mois
# # QuizQuestion: 15 questions (toujours), fun_fact pour les easy
# # QuizAttempt: 1 tentative max par user par quiz, avec temps
# ###########################################################################

import uuid

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, ForeignKey,
    UniqueConstraint, JSON, Boolean,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# ── Modele Quiz — Quiz hebdomadaire ou mensuel ─────────────────────────
class Quiz(Base):
    """Weekly or monthly quiz."""
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)  # nullable for culture G
    week_start = Column(Date, nullable=False)  # Sunday of that week (or month start for monthly)
    title = Column(String(200), nullable=False)
    quiz_type = Column(String(20), nullable=False, default="weekly")  # "weekly" | "monthly"
    day_of_week = Column(Integer, nullable=True)  # 0=Monday, 3=Thursday for weekly; null for monthly
    question_count = Column(Integer, nullable=False, default=15)  # always 15
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("category_id", "week_start", name="uq_quiz_category_week"),
    )

    category = relationship("Category")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")


# ── Modele QuizQuestion — Une question du quiz ────────────────────────
class QuizQuestion(Base):
    """One question in a quiz (always 15). Easy questions have fun_fact."""
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)       # ["opt1", "opt2", "opt3", "opt4"]
    correct_index = Column(Integer, nullable=False)  # 0-3
    difficulty = Column(String(10), nullable=False, default="easy")  # easy, medium, hard
    fun_fact = Column(Text, nullable=True)  # petite blague/anecdote pour les easy
    sort_order = Column(Integer, default=0)

    quiz = relationship("Quiz", back_populates="questions")


# ── Modele QuizAttempt — Tentative d'un utilisateur ───────────────────
class QuizAttempt(Base):
    """One user's attempt at a quiz (max 1 per user per quiz)."""
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False, default=0)
    total = Column(Integer, nullable=False, default=15)
    duration_seconds = Column(Integer, nullable=True)  # Time taken to complete
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "quiz_id", name="uq_user_quiz_attempt"),
    )

    user = relationship("User")
    quiz = relationship("Quiz", back_populates="attempts")
