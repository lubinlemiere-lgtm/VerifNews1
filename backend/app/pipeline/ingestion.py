# ###########################################################################
# # Pipeline Ingestion — Recuperation RSS et API TMDB
# # fetch_rss(): parse un flux RSS, retourne des RawArticle
# # fetch_tmdb_trending(): films/series tendances via API TMDB
# # RawArticle: objet intermediaire avant stockage en base
# ###########################################################################

"""RSS and API ingestion module. Fetches articles from whitelisted sources."""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone

import feedparser
import httpx
from dateutil import parser as date_parser

from app.config import settings

logger = logging.getLogger(__name__)


# ── Modele intermediaire (avant stockage en base) ──────────────────────
@dataclass
class RawArticle:
    title: str
    content: str
    url: str
    image_url: str | None = None
    published_at: datetime | None = None
    source_id: int | None = None
    category_id: int | None = None
    category_slug: str | None = None  # e.g. "politics", "astronomy"
    country_code: str | None = None  # Propagated from source.country_code
    tags: list[str] = field(default_factory=list)


# ── Ingestion RSS ──────────────────────────────────────────────────────
async def fetch_rss(url: str, source_id: int, category_id: int, country_code: str | None = None, category_slug: str | None = None) -> list[RawArticle]:
    """Parse an RSS feed and return raw articles."""
    articles = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, follow_redirects=True)
            resp.raise_for_status()

        feed = feedparser.parse(resp.text)
        for entry in feed.entries[:20]:  # Limit per source
            published = None
            if hasattr(entry, "published"):
                try:
                    published = date_parser.parse(entry.published)
                except (ValueError, TypeError):
                    published = datetime.now(timezone.utc)

            # Extract image
            image_url = None
            if hasattr(entry, "media_content") and entry.media_content:
                image_url = entry.media_content[0].get("url")
            elif hasattr(entry, "enclosures") and entry.enclosures:
                image_url = entry.enclosures[0].get("href")

            content = ""
            if hasattr(entry, "content") and entry.content:
                content = entry.content[0].get("value", "")
            elif hasattr(entry, "summary"):
                content = entry.summary or ""

            tags = [t.get("term", "") for t in getattr(entry, "tags", [])]

            articles.append(
                RawArticle(
                    title=entry.get("title", ""),
                    content=content,
                    url=entry.get("link", ""),
                    image_url=image_url,
                    published_at=published,
                    source_id=source_id,
                    category_id=category_id,
                    category_slug=category_slug,
                    country_code=country_code,
                    tags=tags,
                )
            )
    except Exception as e:
        logger.error(f"Error fetching RSS {url}: {e}")

    return articles


# ── Ingestion API TMDB (films/series tendances) ────────────────────────
async def fetch_tmdb_trending(source_id: int, category_id: int, country_code: str | None = None, category_slug: str | None = None) -> list[RawArticle]:
    """Fetch trending movies/shows from TMDB API."""
    if not settings.TMDB_API_KEY:
        return []

    articles = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.themoviedb.org/3/trending/all/week",
                params={"api_key": settings.TMDB_API_KEY},
            )
            resp.raise_for_status()
            data = resp.json()

        for item in data.get("results", [])[:10]:
            title = item.get("title") or item.get("name", "")
            overview = item.get("overview", "")
            poster = item.get("poster_path")
            image_url = f"https://image.tmdb.org/t/p/w500{poster}" if poster else None
            media_type = item.get("media_type", "movie")
            release_date = item.get("release_date") or item.get("first_air_date")

            published = None
            if release_date:
                try:
                    published = date_parser.parse(release_date)
                except (ValueError, TypeError):
                    pass

            articles.append(
                RawArticle(
                    title=f"[Trending {media_type.title()}] {title}",
                    content=overview,
                    url=f"https://www.themoviedb.org/{media_type}/{item.get('id')}",
                    image_url=image_url,
                    published_at=published,
                    source_id=source_id,
                    category_id=category_id,
                    category_slug=category_slug,
                    country_code=country_code,
                )
            )
    except Exception as e:
        logger.error(f"Error fetching TMDB: {e}")

    return articles
