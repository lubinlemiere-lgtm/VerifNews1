"""Simple in-memory rate limiter for auth endpoints."""

import time
from collections import defaultdict


class RateLimiter:
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    def is_rate_limited(self, key: str) -> bool:
        """Check if the key has exceeded the rate limit."""
        now = time.time()
        cutoff = now - self.window_seconds

        # Remove old requests
        self._requests[key] = [t for t in self._requests[key] if t > cutoff]

        if len(self._requests[key]) >= self.max_requests:
            return True

        self._requests[key].append(now)
        return False

    def remaining(self, key: str) -> int:
        """Get the number of remaining requests for the key."""
        now = time.time()
        cutoff = now - self.window_seconds
        self._requests[key] = [t for t in self._requests[key] if t > cutoff]
        return max(0, self.max_requests - len(self._requests[key]))


# Auth rate limiter: 5 login attempts per minute per IP
auth_limiter = RateLimiter(max_requests=5, window_seconds=60)
