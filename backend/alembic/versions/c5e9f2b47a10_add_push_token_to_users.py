"""add_push_token_to_users

Add push_token and push_token_updated_at columns to users table
for Expo push notification support.

Revision ID: c5e9f2b47a10
Revises: b4d2f1a83e00
Create Date: 2026-03-19 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5e9f2b47a10'
down_revision: Union[str, None] = 'b4d2f1a83e00'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('push_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('push_token_updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'push_token_updated_at')
    op.drop_column('users', 'push_token')
