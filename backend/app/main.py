# ###########################################################################
# # main.py — Point d'entree FastAPI
# # Middleware CORS + securite, rate limiting, health check, demarrage scheduler
# ###########################################################################

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from sqlalchemy import text as sa_text

from app.api.v1.router import api_router
from app.config import settings
from app.database import async_session
from app.pipeline.scheduler import start_scheduler, stop_scheduler
from app.utils.vector_ops import COSINE_SIMILARITY_FUNC
from app.utils.rate_limiter import RateLimiter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

# Global rate limiter: 60 requests/minute per IP
global_limiter = RateLimiter(max_requests=60, window_seconds=60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("VerifNews API starting up...")

    # --- JWT secret validation ---
    if settings.JWT_SECRET == "change-me-in-production" or len(settings.JWT_SECRET) < 32:
        logger.critical("JWT_SECRET is insecure! Set a strong secret (32+ chars) in .env")
        raise SystemExit("FATAL: JWT_SECRET not configured. Set it in .env before starting.")

    try:
        async with async_session() as session:
            await session.execute(sa_text(COSINE_SIMILARITY_FUNC))
            await session.commit()
        logger.info("SQL cosine_similarity function created/updated.")
    except Exception as e:
        logger.warning(f"Could not create cosine_similarity function: {e}")
    try:
        start_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler failed to start: {e}")
    yield
    try:
        stop_scheduler()
    except Exception:
        pass
    logger.info("VerifNews API shutting down.")


app = FastAPI(
    title="VerifNews API",
    description="100% verified news API - Only trusted, cross-verified information",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

# Trusted hosts (prevents host header injection)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "10.0.2.2", "*.verifnews.app", "*.onrender.com"],
)

# CORS: restrict to known origins only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
        "http://10.0.2.2:8081",
        "https://verifnews.app",
        "https://*.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


# --- Global error handler (never leak internal details) ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# --- Security headers + global rate limiting ---
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Rate limit by IP
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() if forwarded else ""
    if not client_ip:
        client_ip = request.client.host if request.client else "unknown"

    if global_limiter.is_rate_limited(f"global:{client_ip}"):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."},
        )

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    # Timing
    response.headers["X-Response-Time-Ms"] = str(duration_ms)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"

    if duration_ms > 1000:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {duration_ms}ms")

    return response


app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "verifnews", "version": "0.1.0"}


@app.get("/health/pipeline")
async def pipeline_health():
    from app.pipeline.scheduler import scheduler

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": str(job.next_run_time) if job.next_run_time else None,
        })
    return {"status": "ok", "scheduler_running": scheduler.running, "jobs": jobs}
