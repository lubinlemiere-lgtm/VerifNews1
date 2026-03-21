"""add_fun_fact_and_15_questions

Add fun_fact column to quiz_questions (for jokes on easy questions).
Update defaults: question_count=15, total=15.

Revision ID: b4d2f1a83e00
Revises: a3c7e8d91f00
Create Date: 2026-03-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4d2f1a83e00'
down_revision: Union[str, None] = 'a3c7e8d91f00'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add fun_fact to quiz_questions (nullable text for easy question jokes)
    op.add_column('quiz_questions', sa.Column('fun_fact', sa.Text(), nullable=True))

    # Update defaults to 15 questions
    op.alter_column('quizzes', 'question_count', server_default='15')
    op.alter_column('quiz_attempts', 'total', server_default='15')


def downgrade() -> None:
    op.alter_column('quiz_attempts', 'total', server_default='10')
    op.alter_column('quizzes', 'question_count', server_default='10')
    op.drop_column('quiz_questions', 'fun_fact')
