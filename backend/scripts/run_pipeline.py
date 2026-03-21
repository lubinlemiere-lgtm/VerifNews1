"""Manually trigger the news pipeline (fetch, clean, embed, verify)."""

import asyncio
import logging
import sys
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

from app.pipeline.scheduler import run_pipeline


async def main():
    print("=" * 60)
    print("  VerifNews Pipeline - Manual Run")
    print("=" * 60)
    start = time.perf_counter()

    await run_pipeline()

    duration = round(time.perf_counter() - start, 1)
    print(f"\nPipeline completed in {duration}s")

    # Show stats
    from app.database import async_session
    from sqlalchemy import text

    async with async_session() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM articles"))
        total = result.scalar()
        result = await db.execute(text("SELECT COUNT(*) FROM articles WHERE is_verified = true"))
        verified = result.scalar()
        print(f"Total articles: {total}")
        print(f"Verified articles: {verified}")


if __name__ == "__main__":
    asyncio.run(main())
