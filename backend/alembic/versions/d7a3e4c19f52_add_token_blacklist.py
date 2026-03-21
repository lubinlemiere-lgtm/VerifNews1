"""add_token_blacklist

Create token_blacklist table for JWT revocation on logout
and refresh token rotation.

Revision ID: d7a3e4c19f52
Revises: c5e9f2b47a10
Create Date: 2026-03-19 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7a3e4c19f52'
down_revision: Union[str, None] = 'c5e9f2b47a10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'token_blacklist',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('jti', sa.String(), nullable=False),
        sa.Column('token_type', sa.String(length=20), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_token_blacklist_jti', 'token_blacklist', ['jti'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_token_blacklist_jti', table_name='token_blacklist')
    op.drop_table('token_blacklist')
