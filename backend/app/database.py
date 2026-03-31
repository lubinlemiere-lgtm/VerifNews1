# ###########################################################################
# # database.py — Connexion async PostgreSQL + SQLAlchemy
# # Engine, session factory, Base ORM, dependency get_db()
# # Semaphore: limite les connexions concurrentes (NullPool n'a pas de cap)
# ###########################################################################

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


# Supabase free tier via PgBouncer : NullPool + pas de prepared statements
# statement_cache_size=0 desactive le cache de prepared statements (requis pour PgBouncer)
# command_timeout: timeout de 30s par requete pour eviter les connexions suspendues
# timeout: timeout de connexion de 10s
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "command_timeout": 30,
        "timeout": 10,
    },
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Semaphore: limite a 10 connexions concurrentes pour eviter l'epuisement
# NullPool ouvre 1 connexion par requete sans limite → le semaphore agit comme cap
_db_semaphore = asyncio.Semaphore(10)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with _db_semaphore:
        async with async_session() as session:
            yield session
