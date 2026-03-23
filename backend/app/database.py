# ###########################################################################
# # database.py — Connexion async PostgreSQL + SQLAlchemy
# # Engine, session factory, Base ORM, dependency get_db()
# ###########################################################################

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


def _build_url(url: str) -> str:
    """Ajoute prepared_statement_cache_size=0 a l'URL pour PgBouncer."""
    sep = "&" if "?" in url else "?"
    return url + sep + "prepared_statement_cache_size=0"


# Supabase free tier via PgBouncer : NullPool + pas de prepared statements
engine = create_async_engine(
    _build_url(settings.DATABASE_URL),
    echo=False,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
    },
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session
