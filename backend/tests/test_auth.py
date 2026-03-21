"""Tests for authentication endpoints and utilities."""

import pytest

from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.utils.text_processing import (
    extractive_summary,
    is_clickbait,
    is_opinion,
    strip_html,
)


class TestPasswordHashing:
    def test_hash_password_returns_string(self):
        hashed = hash_password("test123")
        assert isinstance(hashed, str)
        assert hashed != "test123"

    def test_verify_correct_password(self):
        hashed = hash_password("mypassword")
        assert verify_password("mypassword", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("mypassword")
        assert verify_password("wrongpassword", hashed) is False


class TestJWT:
    def test_create_access_token(self):
        token = create_access_token("user-id-123")
        assert isinstance(token, str)
        assert len(token) > 20

    def test_decode_access_token(self):
        token = create_access_token("user-id-123")
        payload = decode_token(token)
        assert payload["sub"] == "user-id-123"
        assert payload["type"] == "access"

    def test_create_refresh_token(self):
        token = create_refresh_token("user-id-456")
        payload = decode_token(token)
        assert payload["sub"] == "user-id-456"
        assert payload["type"] == "refresh"


class TestTextProcessing:
    def test_strip_html(self):
        assert strip_html("<p>Hello <b>world</b></p>") == "Hello world"
        assert strip_html("") == ""
        assert strip_html(None) == ""

    def test_extractive_summary(self):
        text = "First sentence here. Second sentence is longer and informative. Third one matters too."
        summary = extractive_summary(text, num_sentences=2)
        assert "First sentence" in summary or "Second sentence" in summary

    def test_extractive_summary_empty(self):
        assert extractive_summary("") == ""
        assert extractive_summary(None) == ""

    def test_is_clickbait_positive(self):
        assert is_clickbait("You won't believe what happened next") is True
        assert is_clickbait("This one trick will change your life") is True
        assert is_clickbait("Shocking revelation about celebrities") is True

    def test_is_clickbait_negative(self):
        assert is_clickbait("NASA discovers new exoplanet") is False
        assert is_clickbait("WHO releases health report") is False

    def test_is_opinion_positive(self):
        assert is_opinion("Opinion: The state of politics") is True
        assert is_opinion("Editorial: Why this matters") is True
        assert is_opinion("Regular article", tags=["blog"]) is True

    def test_is_opinion_negative(self):
        assert is_opinion("SpaceX launches Starship") is False
        assert is_opinion("New vaccine approved", tags=["science"]) is False
