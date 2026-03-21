"""Re-generate summaries for all articles using improved TF-IDF algorithm."""
import asyncio
import sys
sys.path.insert(0, ".")

from sqlalchemy import select, func
from app.database import async_session
from app.models.article import Article
from app.utils.text_processing import extractive_summary


async def main():
    async with async_session() as db:
        result = await db.execute(
            select(Article).where(Article.content.isnot(None))
        )
        articles = result.scalars().all()
        print(f"Re-generating summaries for {len(articles)} articles...")

        updated = 0
        for a in articles:
            if not a.content or len(a.content.strip()) < 30:
                continue
            new_summary = extractive_summary(a.content, num_sentences=2, max_chars=280)
            if new_summary and new_summary != a.summary:
                a.summary = new_summary
                updated += 1

        await db.commit()
        print(f"Updated {updated} summaries.")

        # Show some examples
        result = await db.execute(
            select(Article.title, Article.summary)
            .where(Article.summary.isnot(None))
            .order_by(Article.published_at.desc())
            .limit(5)
        )
        print("\n--- Sample summaries ---")
        for title, summary in result.all():
            print(f"\nTitle: {title[:80]}")
            print(f"Summary: {summary[:200]}")


if __name__ == "__main__":
    asyncio.run(main())
