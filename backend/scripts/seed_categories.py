"""Seed the categories table."""

import asyncio

from sqlalchemy import select

from app.database import async_session
from app.models.category import Category
from app.pipeline.sources_config import CATEGORIES_META


async def seed():
    async with async_session() as db:
        for slug, meta in CATEGORIES_META.items():
            result = await db.execute(select(Category).where(Category.slug == slug))
            if result.scalar_one_or_none():
                continue
            cat = Category(slug=slug, name=meta["name"], icon=meta["icon"], description=meta["description"])
            db.add(cat)
        await db.commit()
        print("Categories seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
