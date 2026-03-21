"""Tests for the news pipeline components."""

from app.pipeline.ingestion import RawArticle
from app.pipeline.parser import clean_and_filter
from app.pipeline.sources_config import WHITELISTED_SOURCES, CATEGORIES_META
from datetime import datetime, timezone


class TestSourcesConfig:
    def test_all_categories_have_sources(self):
        for slug in CATEGORIES_META:
            assert slug in WHITELISTED_SOURCES, f"Missing sources for category: {slug}"

    def test_all_sources_have_required_fields(self):
        for cat_slug, sources in WHITELISTED_SOURCES.items():
            for src in sources:
                assert "name" in src, f"Missing 'name' in source for {cat_slug}"
                assert "url" in src, f"Missing 'url' in source for {cat_slug}"
                assert "type" in src, f"Missing 'type' in source for {cat_slug}"
                assert "tier" in src, f"Missing 'tier' in source for {cat_slug}"
                assert src["type"] in ("rss", "api", "scraper"), f"Invalid type: {src['type']}"
                assert 1 <= src["tier"] <= 3, f"Invalid tier: {src['tier']}"

    def test_categories_meta_has_required_fields(self):
        for slug, meta in CATEGORIES_META.items():
            assert "name" in meta
            assert "icon" in meta
            assert "description" in meta

    def test_source_urls_are_valid(self):
        for cat_slug, sources in WHITELISTED_SOURCES.items():
            for src in sources:
                assert src["url"].startswith("http"), f"Invalid URL: {src['url']}"


class TestParser:
    # Default content must have 20+ words to pass the min content length filter
    _DEFAULT_CONTENT = (
        "This is a sufficiently long article content that has been written "
        "with enough words to pass the minimum content filter and be properly "
        "processed by the pipeline during testing."
    )

    def _make_article(self, title="Test article title here", content=None, **kwargs):
        return RawArticle(
            title=title,
            content=content if content is not None else self._DEFAULT_CONTENT,
            url="https://example.com/article",
            published_at=datetime.now(timezone.utc),
            source_id=1,
            category_id=1,
            **kwargs,
        )

    def test_filters_clickbait(self):
        articles = [
            self._make_article(title="You won't believe what NASA found"),
            self._make_article(title="NASA discovers new exoplanet in habitable zone"),
        ]
        cleaned = clean_and_filter(articles)
        assert len(cleaned) == 1
        assert "NASA discovers" in cleaned[0].title

    def test_filters_opinion(self):
        articles = [
            self._make_article(title="Opinion: Why space exploration matters"),
            self._make_article(title="SpaceX successfully launches Starship prototype"),
        ]
        cleaned = clean_and_filter(articles)
        assert len(cleaned) == 1
        assert "SpaceX" in cleaned[0].title

    def test_filters_short_titles(self):
        articles = [
            self._make_article(title="Short"),
            self._make_article(title="This is a proper article title about science"),
        ]
        cleaned = clean_and_filter(articles)
        assert len(cleaned) == 1

    def test_filters_no_date(self):
        article = self._make_article()
        article.published_at = None
        cleaned = clean_and_filter([article])
        assert len(cleaned) == 0

    def test_filters_empty_content(self):
        articles = [
            self._make_article(content="Too short"),
            self._make_article(content="This is a sufficiently long article content that has enough words to pass the filter and be processed by the pipeline properly."),
        ]
        cleaned = clean_and_filter(articles)
        assert len(cleaned) == 1

    def test_strips_html_from_content(self):
        article = self._make_article(
            content=(
                "<p>This is a paragraph with <b>bold</b> and <a href='#'>link</a> content "
                "that has enough words to pass the minimum content length filter requirement "
                "for the pipeline to properly process this article during testing.</p>"
            )
        )
        cleaned = clean_and_filter([article])
        assert len(cleaned) == 1
        assert "<p>" not in cleaned[0].content
        assert "<b>" not in cleaned[0].content
