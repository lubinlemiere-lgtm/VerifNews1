# ###########################################################################
# # API Bookmarks — Gestion des articles favoris
# # GET /bookmarks — Liste des bookmarks de l'utilisateur connecte
# # POST /bookmarks/{article_id} — Ajouter un bookmark
# # DELETE /bookmarks/{article_id} — Supprimer un bookmark
# # Toutes les routes necessitent un JWT valide (get_current_user)
# ###########################################################################

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.article import Article
from app.models.bookmark import Bookmark
from app.models.user import User
from app.schemas.article import ArticleListItem

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


def _article_to_item(a: Article) -> ArticleListItem:
    """Convertit un ORM Article en schema ArticleListItem."""
    return ArticleListItem(
        id=a.id,
        title=a.title,
        summary=a.summary,
        image_url=a.image_url,
        category_slug=a.category.slug if a.category else None,
        published_at=a.published_at,
        is_verified=a.is_verified,
        verification_count=a.verification_count,
        has_audio=a.audio_url is not None,
    )


@router.get("", response_model=list[ArticleListItem])
async def list_bookmarks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retourne tous les articles bookmarkes par l'utilisateur, les plus recents en premier."""
    query = (
        select(Bookmark)
        .where(Bookmark.user_id == user.id)
        .options(
            joinedload(Bookmark.article).joinedload(Article.category),
        )
        .order_by(Bookmark.created_at.desc())
    )
    result = await db.execute(query)
    bookmarks = result.scalars().unique().all()

    # Filtrer les bookmarks dont l'article a ete supprime (cascade devrait le gerer, mais securite)
    items: list[ArticleListItem] = []
    for bm in bookmarks:
        if bm.article is not None:
            items.append(_article_to_item(bm.article))
    return items


@router.post("/{article_id}", status_code=status.HTTP_201_CREATED)
async def add_bookmark(
    article_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ajoute un article aux bookmarks. Ignore silencieusement si deja present."""
    # Verifier que l'article existe
    article = await db.get(Article, article_id)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    # Verifier si deja bookmarke
    existing = await db.execute(
        select(Bookmark).where(
            Bookmark.user_id == user.id,
            Bookmark.article_id == article_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already bookmarked"}

    bookmark = Bookmark(user_id=user.id, article_id=article_id)
    db.add(bookmark)
    await db.commit()
    return {"message": "Bookmark added"}


@router.delete("/{article_id}", status_code=status.HTTP_200_OK)
async def remove_bookmark(
    article_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprime un article des bookmarks. Ignore silencieusement si absent."""
    result = await db.execute(
        delete(Bookmark).where(
            Bookmark.user_id == user.id,
            Bookmark.article_id == article_id,
        )
    )
    await db.commit()

    if result.rowcount == 0:
        return {"message": "Bookmark not found (already removed)"}
    return {"message": "Bookmark removed"}
