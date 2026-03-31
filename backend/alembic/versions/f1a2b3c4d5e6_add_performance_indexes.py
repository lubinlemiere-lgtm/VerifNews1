"""add_performance_indexes

Ajoute des index de performance sur les colonnes les plus requetees:
articles (published_at, category_id, is_verified, country_code + composite feed),
reactions (article_id, user_id + composite count), bookmarks (user_id),
user_preferences (user_id), verifications (article_id), quiz_attempts (user_id, quiz_id),
token_blacklist (jti, expires_at).

Revision ID: f1a2b3c4d5e6
Revises: e8b4f5d72a31
Create Date: 2026-03-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'e8b4f5d72a31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Create missing tables (reactions + bookmarks) ─────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS reactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
            reaction_type VARCHAR(10) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT uq_user_article_reaction UNIQUE (user_id, article_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bookmarks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT uq_user_article_bookmark UNIQUE (user_id, article_id)
        )
    """)

    # ── articles ─────────────────────────────────────────────────────
    op.execute('CREATE INDEX IF NOT EXISTS ix_articles_published_at ON articles (published_at DESC)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_articles_category_id ON articles (category_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_articles_is_verified ON articles (is_verified)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_articles_country_code ON articles (country_code)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_articles_feed_composite ON articles (category_id, is_verified, published_at DESC)')

    # ── reactions ────────────────────────────────────────────────────
    op.execute('CREATE INDEX IF NOT EXISTS ix_reactions_article_id ON reactions (article_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_reactions_user_id ON reactions (user_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_reactions_article_type ON reactions (article_id, reaction_type)')

    # ── bookmarks ────────────────────────────────────────────────────
    op.execute('CREATE INDEX IF NOT EXISTS ix_bookmarks_user_id ON bookmarks (user_id)')

    # ── user_preferences ─────────────────────────────────────────────
    op.execute('CREATE INDEX IF NOT EXISTS ix_user_preferences_user_id ON user_preferences (user_id)')

    # ── verifications ────────────────────────────────────────────────
    op.execute('CREATE INDEX IF NOT EXISTS ix_verifications_article_id ON verifications (article_id)')

    # ── quiz_attempts (table created if missing) ──────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            quiz_id UUID NOT NULL,
            score INTEGER DEFAULT 0,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)
    op.execute('CREATE INDEX IF NOT EXISTS ix_quiz_attempts_user_id ON quiz_attempts (user_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_quiz_attempts_quiz_id ON quiz_attempts (quiz_id)')

    # ── token_blacklist (table created if missing) ────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS token_blacklist (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            jti VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)
    op.execute('CREATE INDEX IF NOT EXISTS ix_token_blacklist_jti ON token_blacklist (jti)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_token_blacklist_expires_at ON token_blacklist (expires_at)')


def downgrade() -> None:
    # Drop in reverse order
    op.drop_index('ix_token_blacklist_expires_at', table_name='token_blacklist')
    op.drop_index('ix_token_blacklist_jti', table_name='token_blacklist')
    op.drop_index('ix_quiz_attempts_quiz_id', table_name='quiz_attempts')
    op.drop_index('ix_quiz_attempts_user_id', table_name='quiz_attempts')
    op.drop_index('ix_verifications_article_id', table_name='verifications')
    op.drop_index('ix_user_preferences_user_id', table_name='user_preferences')
    op.drop_index('ix_bookmarks_user_id', table_name='bookmarks')
    op.drop_index('ix_reactions_article_type', table_name='reactions')
    op.drop_index('ix_reactions_user_id', table_name='reactions')
    op.drop_index('ix_reactions_article_id', table_name='reactions')
    op.drop_index('ix_articles_feed_composite', table_name='articles')
    op.drop_index('ix_articles_country_code', table_name='articles')
    op.drop_index('ix_articles_is_verified', table_name='articles')
    op.drop_index('ix_articles_category_id', table_name='articles')
    op.drop_index('ix_articles_published_at', table_name='articles')
