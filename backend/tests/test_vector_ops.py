"""Tests for vector operations (cosine similarity without pgvector)."""

from app.utils.vector_ops import embedding_to_pg_array, COSINE_SIMILARITY_FUNC


class TestEmbeddingToPgArray:
    def test_simple_array(self):
        result = embedding_to_pg_array([1.0, 2.0, 3.0])
        assert result.startswith("ARRAY[")
        assert result.endswith("]::DOUBLE PRECISION[]")
        assert "1.000000" in result
        assert "2.000000" in result
        assert "3.000000" in result

    def test_negative_values(self):
        result = embedding_to_pg_array([-0.5, 0.0, 0.5])
        assert "-0.500000" in result
        assert "0.000000" in result
        assert "0.500000" in result

    def test_empty_array(self):
        result = embedding_to_pg_array([])
        assert result == "ARRAY[]::DOUBLE PRECISION[]"

    def test_single_element(self):
        result = embedding_to_pg_array([0.123456789])
        assert "0.123457" in result  # Rounded to 6 decimal places

    def test_cosine_function_sql_is_valid(self):
        """The SQL function definition should contain expected keywords."""
        assert "CREATE OR REPLACE FUNCTION" in COSINE_SIMILARITY_FUNC
        assert "cosine_similarity" in COSINE_SIMILARITY_FUNC
        assert "DOUBLE PRECISION[]" in COSINE_SIMILARITY_FUNC
        assert "dot_product" in COSINE_SIMILARITY_FUNC
        assert "IMMUTABLE" in COSINE_SIMILARITY_FUNC


class TestRateLimiter:
    def test_allows_initial_requests(self):
        from app.utils.rate_limiter import RateLimiter
        limiter = RateLimiter(max_requests=3, window_seconds=60)
        assert limiter.is_rate_limited("test_key") is False
        assert limiter.is_rate_limited("test_key") is False
        assert limiter.is_rate_limited("test_key") is False

    def test_blocks_after_limit(self):
        from app.utils.rate_limiter import RateLimiter
        limiter = RateLimiter(max_requests=2, window_seconds=60)
        assert limiter.is_rate_limited("key1") is False
        assert limiter.is_rate_limited("key1") is False
        assert limiter.is_rate_limited("key1") is True  # 3rd request blocked

    def test_different_keys_independent(self):
        from app.utils.rate_limiter import RateLimiter
        limiter = RateLimiter(max_requests=1, window_seconds=60)
        assert limiter.is_rate_limited("key_a") is False
        assert limiter.is_rate_limited("key_b") is False  # Different key, not blocked
        assert limiter.is_rate_limited("key_a") is True   # Same key, blocked
