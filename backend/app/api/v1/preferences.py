# ###########################################################################
# # API Preferences — Gestion categories et pays utilisateur
# # GET /categories — Liste toutes les categories
# # GET /preferences — Abonnements de l'utilisateur
# # PUT /preferences — Met a jour les categories abonnees
# # PUT /preferences/country — Met a jour le pays prefere
# ###########################################################################

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/preferences", tags=["preferences"])


# ── Schemas de requete ─────────────────────────────────────────────────
class PreferencesUpdate(BaseModel):
    category_ids: list[int]


class CountryUpdate(BaseModel):
    country_code: str


class PreferenceItem(BaseModel):
    category_id: int
    category_name: str
    category_slug: str
    is_subscribed: bool
    notification_enabled: bool

    model_config = {"from_attributes": True}


# ── Endpoints ──────────────────────────────────────────────────────────
@router.get("", response_model=list[PreferenceItem])
async def get_preferences(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreference)
        .where(UserPreference.user_id == user.id)
        .join(UserPreference.category)
    )
    prefs = result.scalars().all()
    return [
        PreferenceItem(
            category_id=p.category_id,
            category_name=p.category.name,
            category_slug=p.category.slug,
            is_subscribed=p.is_subscribed,
            notification_enabled=p.notification_enabled,
        )
        for p in prefs
    ]


@router.put("")
async def update_preferences(
    data: PreferencesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Remove existing preferences
    await db.execute(delete(UserPreference).where(UserPreference.user_id == user.id))

    # Add new preferences
    for cat_id in data.category_ids:
        pref = UserPreference(user_id=user.id, category_id=cat_id, is_subscribed=True)
        db.add(pref)

    await db.commit()
    return {"status": "ok", "subscribed_categories": len(data.category_ids)}


@router.put("/country")
async def update_country(
    data: CountryUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.country_code = data.country_code
    await db.commit()
    return {"status": "ok", "country_code": data.country_code}


# ── Notification par categorie ──────────────────────────────────────────
@router.put("/notify")
async def update_notification_prefs(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update notification_enabled for user's category preferences."""
    category_id = body.get("category_id")
    enabled = body.get("enabled", False)

    if category_id is None:
        raise HTTPException(400, "category_id is required")

    stmt = select(UserPreference).where(
        UserPreference.user_id == current_user.id,
        UserPreference.category_id == category_id,
    )
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()

    if pref:
        pref.notification_enabled = enabled
    else:
        pref = UserPreference(
            user_id=current_user.id,
            category_id=category_id,
            is_subscribed=True,
            notification_enabled=enabled,
        )

    db.add(pref)
    await db.commit()
    return {"status": "ok"}
