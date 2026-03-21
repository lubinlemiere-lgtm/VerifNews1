# ###########################################################################
# # Pipeline Scheduler — Jobs planifies (APScheduler)
# # run_pipeline(): fetch → clean → NLP → dedup → verify → store
# # run_re_verification(): re-verifie articles en attente
# # run_weekly_quiz(): cree 2 quiz/semaine (rotation categories) chaque dimanche
# # run_monthly_culture_quiz(): cree quiz culture G le dernier vendredi du mois
# # run_cleanup(): supprime articles > 30 jours
# ###########################################################################

"""Pipeline scheduler: runs ingestion, processing, and verification jobs."""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import func, select, delete, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import async_session
from app.models.article import Article
from app.models.audio_cache import AudioCache
from app.models.source import Source
from app.pipeline.cross_verifier import verify_article
from app.pipeline.deduplicator import is_duplicate
from app.pipeline.ingestion import RawArticle, fetch_rss, fetch_tmdb_trending
from app.pipeline.nlp_processor import process_articles
from app.pipeline.parser import clean_and_filter
from app.services.verification_service import re_verify_pending
from app.services.quiz_service import create_weekly_quizzes, create_monthly_culture_quiz
from app.services.notification_service import notify_daily_digest, notify_quiz_available
from app.utils.text_processing import extractive_summary

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def run_pipeline():
    """Main pipeline job: fetch, clean, embed, deduplicate, verify."""
    logger.info("Pipeline run started")

    async with async_session() as db:
        # Get all active sources (eager-load category for slug)
        result = await db.execute(
            select(Source).where(Source.is_active.is_(True)).options(selectinload(Source.category))
        )
        sources = result.scalars().all()

        all_raw: list[RawArticle] = []

        for source in sources:
            try:
                cat_slug = source.category.slug if source.category else None
                if source.source_type == "rss":
                    articles = await fetch_rss(source.url, source.id, source.category_id, source.country_code, cat_slug)
                elif source.source_type == "api" and "tmdb" in source.url.lower():
                    articles = await fetch_tmdb_trending(source.id, source.category_id, source.country_code, cat_slug)
                else:
                    continue
                all_raw.extend(articles)
            except Exception as e:
                logger.error(f"Source {source.name} failed: {e}")

        logger.info(f"Fetched {len(all_raw)} raw articles from {len(sources)} sources")

        # Clean and filter
        cleaned = clean_and_filter(all_raw)

        # NLP processing (embeddings + summaries)
        processed = process_articles(cleaned)

        # Deduplicate and store
        new_count = 0
        for raw_article, embedding, summary in processed:
            if await is_duplicate(embedding, raw_article.category_id, db):
                continue

            article = Article(
                title=raw_article.title,
                summary=summary,
                content=raw_article.content,
                original_url=raw_article.url,
                image_url=raw_article.image_url,
                category_id=raw_article.category_id,
                primary_source_id=raw_article.source_id,
                published_at=raw_article.published_at,
                embedding=embedding,
                country_code=raw_article.country_code,
            )
            db.add(article)
            await db.flush()

            # Attempt cross-verification
            await verify_article(article, db)
            new_count += 1

        await db.commit()
        logger.info(f"Pipeline complete: {new_count} new articles stored")


async def run_re_verification():
    """Re-check unverified articles against new data."""
    async with async_session() as db:
        count = await re_verify_pending(db)
        logger.info(f"Re-verification: {count} articles newly verified")


async def run_weekly_quiz():
    """Create weekly quizzes every Sunday for each category."""
    async with async_session() as db:
        count = await create_weekly_quizzes(db)
        logger.info(f"Weekly quiz: {count} new quizzes created")


async def run_monthly_culture_quiz():
    """Create culture generale quiz on last Friday of month."""
    from datetime import date, timedelta
    today = date.today()
    # Check if this is the last Friday of the month
    next_week = today + timedelta(days=7)
    if next_week.month != today.month:
        # This IS the last Friday — create culture G quiz
        async with async_session() as db:
            count = await create_monthly_culture_quiz(db)
            logger.info(f"Monthly culture quiz created: {count}")


async def run_daily_digest():
    """Send daily digest notification at 9am."""
    async with async_session() as db:
        # Count articles from last 24h (uses COUNT instead of loading all rows)
        result = await db.execute(
            select(func.count()).select_from(Article).where(
                Article.created_at > text("NOW() - INTERVAL '24 hours'")
            )
        )
        count = result.scalar() or 0
        if count > 0:
            sent = await notify_daily_digest(db, count)
            logger.info(f"Daily digest: {sent} notifications sent ({count} articles)")


async def run_quiz_notification():
    """Send quiz notification when new quizzes are created (Monday + Thursday 9am)."""
    from app.models.quiz import Quiz
    from datetime import date, timedelta

    async with async_session() as db:
        # Find quizzes created today
        today = date.today()
        result = await db.execute(
            select(Quiz).where(Quiz.created_at >= today)
        )
        quizzes = result.scalars().all()
        for quiz in quizzes:
            sent = await notify_quiz_available(db, quiz.title, quiz.id)
            logger.info(f"Quiz notification: {sent} sent for '{quiz.title}'")


async def run_token_cleanup():
    """Remove expired tokens from blacklist to keep the table lean."""
    from app.models.token_blacklist import TokenBlacklist
    async with async_session() as db:
        result = await db.execute(
            delete(TokenBlacklist).where(TokenBlacklist.expires_at < text("NOW()"))
        )
        await db.commit()
        if result.rowcount > 0:
            logger.info(f"Token cleanup: removed {result.rowcount} expired tokens")


async def run_cleanup():
    """Remove articles older than 30 days."""
    async with async_session() as db:
        # Delete old audio files first (via cascade), then articles
        result = await db.execute(
            delete(Article).where(Article.created_at < text("NOW() - INTERVAL '30 days'"))
        )
        await db.commit()
        logger.info(f"Cleanup: removed {result.rowcount} old articles")


def start_scheduler():
    """Configure and start the pipeline scheduler."""
    scheduler.add_job(
        run_pipeline,
        "interval",
        minutes=settings.PIPELINE_INTERVAL_MINUTES,
        id="pipeline_main",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        run_re_verification,
        "interval",
        minutes=60,
        id="re_verify",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        run_cleanup,
        "cron",
        hour=3,
        minute=0,
        id="cleanup",
        replace_existing=True,
        max_instances=1,
    )
    # Weekly quiz: every Sunday at 00:05
    scheduler.add_job(
        run_weekly_quiz,
        "cron",
        day_of_week="sun",
        hour=0,
        minute=5,
        id="weekly_quiz",
        replace_existing=True,
        max_instances=1,
    )
    # Monthly culture G quiz: every Friday at 00:10 (checks if last Friday)
    scheduler.add_job(
        run_monthly_culture_quiz,
        "cron",
        day_of_week="fri",
        hour=0,
        minute=10,
        id="monthly_culture_quiz",
        replace_existing=True,
        max_instances=1,
    )
    # Daily digest notification: every day at 9am
    scheduler.add_job(
        run_daily_digest,
        "cron",
        hour=9,
        minute=0,
        id="daily_digest",
        replace_existing=True,
        max_instances=1,
    )
    # Quiz reminder: Monday + Thursday + Friday at 9am (Friday for culture G)
    scheduler.add_job(
        run_quiz_notification,
        "cron",
        day_of_week="mon,thu,fri",
        hour=9,
        minute=0,
        id="quiz_notification",
        replace_existing=True,
        max_instances=1,
    )
    # Token blacklist cleanup: daily at 4am
    scheduler.add_job(
        run_token_cleanup,
        "cron",
        hour=4,
        minute=0,
        id="token_cleanup",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("Pipeline scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
