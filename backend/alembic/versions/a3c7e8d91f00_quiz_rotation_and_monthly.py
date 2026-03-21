"""quiz_rotation_and_monthly

Add quiz_type, day_of_week, question_count to quizzes.
Add duration_seconds to quiz_attempts.
Make category_id nullable (for culture G quizzes).

Revision ID: a3c7e8d91f00
Revises: 01b1555ca7c2
Create Date: 2026-03-17 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c7e8d91f00'
down_revision: Union[str, None] = '01b1555ca7c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New columns on quizzes
    op.add_column('quizzes', sa.Column('quiz_type', sa.String(20), nullable=False, server_default='weekly'))
    op.add_column('quizzes', sa.Column('day_of_week', sa.Integer(), nullable=True))
    op.add_column('quizzes', sa.Column('question_count', sa.Integer(), nullable=False, server_default='10'))

    # Make category_id nullable (for culture G quizzes with no category)
    op.alter_column('quizzes', 'category_id', existing_type=sa.Integer(), nullable=True)

    # Duration tracking on attempts
    op.add_column('quiz_attempts', sa.Column('duration_seconds', sa.Integer(), nullable=True))

    # Update default total from 20 to 10
    op.alter_column('quiz_attempts', 'total', server_default='10')


def downgrade() -> None:
    op.alter_column('quiz_attempts', 'total', server_default='20')
    op.drop_column('quiz_attempts', 'duration_seconds')
    op.alter_column('quizzes', 'category_id', existing_type=sa.Integer(), nullable=False)
    op.drop_column('quizzes', 'question_count')
    op.drop_column('quizzes', 'day_of_week')
    op.drop_column('quizzes', 'quiz_type')
