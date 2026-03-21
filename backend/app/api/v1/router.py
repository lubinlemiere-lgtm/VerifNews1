from fastapi import APIRouter

from app.api.v1.articles import router as articles_router
from app.api.v1.auth import router as auth_router
from app.api.v1.categories import router as categories_router
from app.api.v1.feed import router as feed_router
from app.api.v1.preferences import router as preferences_router
from app.api.v1.quiz import router as quiz_router
from app.api.v1.tts import router as tts_router
from app.api.v1.bookmarks import router as bookmarks_router
from app.api.v1.reactions import router as reactions_router
from app.api.v1.stats import router as stats_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(feed_router)
api_router.include_router(articles_router)
api_router.include_router(categories_router)
api_router.include_router(tts_router)
api_router.include_router(preferences_router)
api_router.include_router(quiz_router)
api_router.include_router(bookmarks_router)
api_router.include_router(reactions_router)
api_router.include_router(stats_router)
