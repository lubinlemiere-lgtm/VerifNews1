# ###########################################################################
# # notification_service.py — Notifications push via Expo Push API
# # Gere l'envoi unitaire et par lot (batch) des notifications
# # Types: breaking news, digest quotidien, quiz, alertes categorie
# # Expo route automatiquement vers APNs (iOS) et FCM (Android)
# ###########################################################################

"""
Notification Service — Send push notifications via Expo Push API.
Expo handles both iOS (APNs) and Android (FCM) routing.
Endpoint: https://exp.host/--/api/v2/push/send
"""

import httpx
import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_preference import UserPreference

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Tracks tokens that Expo flagged as DeviceNotRegistered.
# Populated by send_push / send_push_batch, drained by cleanup_dead_tokens.
_dead_tokens: set[str] = set()


# ── Envoi unitaire ─────────────────────────────────────────────────────
async def send_push(token: str, title: str, body: str, data: Optional[dict] = None, channel: str = "default") -> bool:
    """Send a single push notification via Expo."""
    message = {
        "to": token,
        "sound": "default",
        "title": title,
        "body": body,
        "channelId": channel,
    }
    if data:
        message["data"] = data

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(EXPO_PUSH_URL, json=[message], timeout=10)
            result = resp.json()
            if resp.status_code == 200:
                ticket = result.get("data", [{}])[0]
                if ticket.get("status") == "error":
                    detail = ticket.get("details", {})
                    if detail.get("error") == "DeviceNotRegistered":
                        logger.info(f"Dead push token detected: {token[:20]}... — marking for cleanup")
                        _dead_tokens.add(token)
                    else:
                        logger.warning(f"Push failed for token {token[:20]}...: {ticket.get('message')}")
                    return False
                return True
            logger.warning(f"Expo Push API error: {resp.status_code}")
            return False
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return False


# ── Envoi par lot (batch, max 100 par requete Expo) ────────────────────
async def send_push_batch(tokens_and_messages: list[dict]) -> int:
    """Send multiple push notifications in a batch. Returns count of successful sends."""
    if not tokens_and_messages:
        return 0

    messages = []
    for item in tokens_and_messages:
        msg = {
            "to": item["token"],
            "sound": "default",
            "title": item["title"],
            "body": item["body"],
            "channelId": item.get("channel", "default"),
        }
        if item.get("data"):
            msg["data"] = item["data"]
        messages.append(msg)

    dead_tokens: list[str] = []
    try:
        async with httpx.AsyncClient() as client:
            # Expo accepts up to 100 per request
            success = 0
            for i in range(0, len(messages), 100):
                batch = messages[i:i+100]
                resp = await client.post(EXPO_PUSH_URL, json=batch, timeout=30)
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    for j, ticket in enumerate(data):
                        if ticket.get("status") == "ok":
                            success += 1
                        elif ticket.get("status") == "error":
                            detail = ticket.get("details", {})
                            if detail.get("error") == "DeviceNotRegistered":
                                dead_tokens.append(batch[j]["to"])
            if dead_tokens:
                logger.info(f"Batch push: {len(dead_tokens)} dead tokens detected")
                _dead_tokens.update(dead_tokens)
            return success
    except Exception as e:
        logger.error(f"Batch push error: {e}")
        return 0


# ── Mapping type de notification → colonne User ──────────────────────
NOTIFICATION_TYPE_COLUMN = {
    "breaking_news": User.notify_breaking_news,
    "daily_digest": User.notify_daily_digest,
    "quiz_reminders": User.notify_quiz_reminders,
    "category_alerts": User.notify_category_alerts,
}


# ── Recuperation des tokens push par type de notification ──────────────
async def get_tokens_for_notification_type(db: AsyncSession, notification_type: str) -> list[tuple[str, int]]:
    """
    Recupere les push tokens des utilisateurs ayant active un type de notification.
    notification_type: 'breaking_news', 'daily_digest', 'quiz_reminders', 'category_alerts'
    Retourne une liste de (token, user_id).
    Filtre par la colonne correspondante sur le modele User.
    """
    stmt = select(User.push_token, User.id).where(
        User.push_token.isnot(None),
        User.is_active == True,
    )

    # Appliquer le filtre de preference si le type est connu
    column = NOTIFICATION_TYPE_COLUMN.get(notification_type)
    if column is not None:
        stmt = stmt.where(column == True)

    result = await db.execute(stmt)
    return [(row[0], row[1]) for row in result.fetchall()]


# ── Nettoyage des tokens invalides ─────────────────────────────────────
async def cleanup_dead_tokens(db: AsyncSession):
    """Remove push tokens that Expo has flagged as DeviceNotRegistered.

    Called periodically by the scheduler to clean up tokens for devices
    that have uninstalled the app or revoked notification permissions.
    Dead tokens are collected by send_push / send_push_batch at runtime.
    """
    global _dead_tokens

    if not _dead_tokens:
        logger.info("Dead token cleanup: no dead tokens to remove")
        return

    # Snapshot and clear the set so new errors can accumulate during cleanup
    tokens_to_remove = _dead_tokens.copy()
    _dead_tokens = set()

    result = await db.execute(
        select(User).where(User.push_token.in_(tokens_to_remove))
    )
    users = result.scalars().all()

    if not users:
        logger.info("Dead token cleanup: no matching users found for %d dead tokens", len(tokens_to_remove))
        return

    for user in users:
        user.push_token = None
        user.push_token_updated_at = None

    await db.commit()
    logger.info("Dead token cleanup: cleared push_token for %d users", len(users))


# ── Fonctions d'envoi par type de notification ─────────────────────────
async def notify_breaking_news(db: AsyncSession, article_title: str, article_id: int):
    """Send breaking news notification to all subscribed users."""
    tokens = await get_tokens_for_notification_type(db, "breaking_news")
    if not tokens:
        return 0

    messages = [
        {
            "token": token,
            "title": "\U0001f534 Breaking News",
            "body": article_title,
            "data": {"articleId": str(article_id), "type": "breaking"},
            "channel": "breaking",
        }
        for token, _ in tokens
    ]
    return await send_push_batch(messages)


async def notify_daily_digest(db: AsyncSession, article_count: int):
    """Send daily digest notification."""
    tokens = await get_tokens_for_notification_type(db, "daily_digest")
    if not tokens:
        return 0

    messages = [
        {
            "token": token,
            "title": "\U0001f4f0 Votre r\u00e9sum\u00e9 du jour",
            "body": f"{article_count} articles v\u00e9rifi\u00e9s vous attendent",
            "data": {"type": "digest"},
            "channel": "default",
        }
        for token, _ in tokens
    ]
    return await send_push_batch(messages)


async def notify_quiz_available(db: AsyncSession, quiz_title: str, quiz_id: int):
    """Send quiz reminder notification."""
    tokens = await get_tokens_for_notification_type(db, "quiz_reminders")
    if not tokens:
        return 0

    messages = [
        {
            "token": token,
            "title": "\U0001f9e0 Nouveau Quiz disponible !",
            "body": quiz_title,
            "data": {"quizId": str(quiz_id), "type": "quiz"},
            "channel": "default",
        }
        for token, _ in tokens
    ]
    return await send_push_batch(messages)


async def notify_category_article(db: AsyncSession, category_name: str, article_title: str, article_id: int, category_id: int):
    """Send notification for new article in a subscribed category."""
    # Get users subscribed to this category with push tokens
    stmt = (
        select(User.push_token, User.id)
        .join(UserPreference, UserPreference.user_id == User.id)
        .where(
            User.push_token.isnot(None),
            User.is_active == True,
            UserPreference.category_id == category_id,
            UserPreference.is_subscribed == True,
            UserPreference.notification_enabled == True,
        )
    )
    result = await db.execute(stmt)
    tokens = result.fetchall()

    if not tokens:
        return 0

    messages = [
        {
            "token": row[0],
            "title": f"\U0001f4cc {category_name}",
            "body": article_title,
            "data": {"articleId": str(article_id), "type": "category"},
            "channel": "default",
        }
        for row in tokens
    ]
    return await send_push_batch(messages)
