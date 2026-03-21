"""Seed the sources table from the whitelisted sources config."""

import asyncio

from sqlalchemy import select

from app.database import async_session
from app.models.category import Category
from app.models.source import Source
from app.pipeline.sources_config import WHITELISTED_SOURCES


async def seed():
    async with async_session() as db:
        for cat_slug, sources in WHITELISTED_SOURCES.items():
            # Get category ID
            result = await db.execute(select(Category).where(Category.slug == cat_slug))
            category = result.scalar_one_or_none()
            if not category:
                print(f"Category '{cat_slug}' not found. Run seed_categories.py first.")
                continue

            for src in sources:
                result = await db.execute(select(Source).where(Source.url == src["url"]))
                if result.scalar_one_or_none():
                    continue
                source = Source(
                    name=src["name"],
                    url=src["url"],
                    source_type=src["type"],
                    reliability_tier=src["tier"],
                    category_id=category.id,
                )
                db.add(source)

        await db.commit()
        print("Sources seeded.")


if __name__ == "__main__":
    asyncio.run(seed())
