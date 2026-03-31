"""add_notification_prefs_to_users

Ajoute les colonnes de preferences de notification globales sur la table users:
notify_breaking_news, notify_daily_digest, notify_quiz_reminders, notify_category_alerts.
Permet au backend de filtrer les envois push par type de notification.

Revision ID: e8b4f5d72a31
Revises: d7a3e4c19f52
Create Date: 2026-03-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8b4f5d72a31'
down_revision: Union[str, None] = 'd7a3e4c19f52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('notify_breaking_news', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('users', sa.Column('notify_daily_digest', sa.Boolean(), server_default='true', nullable=True))
    op.add_column('users', sa.Column('notify_quiz_reminders', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('users', sa.Column('notify_category_alerts', sa.Boolean(), server_default='true', nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'notify_category_alerts')
    op.drop_column('users', 'notify_quiz_reminders')
    op.drop_column('users', 'notify_daily_digest')
    op.drop_column('users', 'notify_breaking_news')
