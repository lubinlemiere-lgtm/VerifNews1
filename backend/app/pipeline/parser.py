# ###########################################################################
# # Pipeline Parser — Nettoyage HTML et filtrage contenu
# # Rejette: clickbait, opinion, articles trop courts
# # Nettoie: balises HTML, espaces multiples, caracteres speciaux
# ###########################################################################

"""Content cleaning and filtering. Rejects clickbait, opinion, and unreliable content."""

import logging
from urllib.parse import urlparse

from app.pipeline.ingestion import RawArticle
from app.pipeline.sources_config import BANNED_DOMAINS
from app.utils.text_processing import is_clickbait, is_opinion, strip_html

logger = logging.getLogger(__name__)


# ── Verification des domaines bannis ───────────────────────────────────
def _is_banned_url(url: str | None) -> bool:
    """Check if an article URL comes from a banned domain."""
    if not url:
        return False
    try:
        domain = urlparse(url).netloc.lower()
        return any(banned in domain for banned in BANNED_DOMAINS)
    except Exception:
        return False


# ── Detection de contenu suspect (desinformation, promo) ──────────────
def _is_suspicious_content(title: str, content: str) -> bool:
    """Detect low-quality or potentially misleading content signals."""
    title_lower = title.lower()
    content_lower = content.lower()

    # ALL CAPS title (often clickbait/sensationalism)
    if title.isupper() and len(title) > 20:
        return True

    # Excessive punctuation (!!!, ???, ...)
    if title.count("!") >= 3 or title.count("?") >= 3:
        return True

    # Conspiracy / misinformation keywords
    misinfo_patterns = [
        "they don't want you to know",
        "exposed",
        "secret plan",
        "wake up",
        "mainstream media won't tell",
        "big pharma",
        "government cover",
        "miracle cure",
        "100% proven",
        "scientists baffled",
        "deep state",
    ]
    for pattern in misinfo_patterns:
        if pattern in title_lower or pattern in content_lower[:500]:
            return True

    # Sponsored / promotional content
    promo_patterns = [
        "sponsored content",
        "paid partnership",
        "affiliate link",
        "buy now",
        "limited time offer",
        "use code",
        "discount",
    ]
    for pattern in promo_patterns:
        if pattern in content_lower[:300]:
            return True

    return False


# ── Politics importance filter ──────────────────────────────────────────
# For the politics category, only keep articles about major events:
# elections, conflicts, summits, laws, crises, diplomacy.
# Filter out trivial stories (celebrity gossip, social media drama, minor
# procedural items) so the feed stays high-signal.

_POLITICS_HIGH_IMPORTANCE_KEYWORDS: list[str] = [
    # FR keywords
    "election", "sommet", "guerre", "conflit", "loi", "referendum",
    "sanctions", "diplomatie", "traite", "crise", "premier ministre",
    "president", "parlement", "senat", "assemblee", "onu", "otan",
    "union europeenne", "g7", "g20", "cessez-le-feu", "coup d'etat",
    "manifestation", "reforme", "vote", "coalition", "negociation",
    # EN keywords
    "election", "summit", "war", "conflict", "law", "referendum",
    "sanctions", "diplomacy", "treaty", "crisis", "prime minister",
    "president", "parliament", "senate", "congress", "united nations",
    "nato", "european union", "ceasefire", "coup", "protest",
    "legislation", "vote", "coalition", "negotiation", "invasion",
    "military", "nuclear", "climate accord", "peace deal",
    "impeach", "cabinet", "supreme court", "indictment",
]

_POLITICS_LOW_IMPORTANCE_PATTERNS: list[str] = [
    # Trivial / gossip / social media noise
    "tweet", "twitter", "x post", "instagram",
    "tiktok", "viral video", "meme", "gaffe",
    "fashion", "outfit", "vacation", "holiday photo",
    "birthday", "wedding", "divorce", "pet",
    "celebrity", "reality tv", "tabloid",
    "rumor", "rumeur", "gossip", "polemique",
    "clash sur les reseaux", "buzz",
]


def _is_trivial_politics(title: str, content: str) -> bool:
    """Return True if a politics article is about minor / unimportant topics."""
    title_lower = title.lower()
    content_start = content[:600].lower()
    combined = title_lower + " " + content_start

    has_low_signal = any(p in title_lower for p in _POLITICS_LOW_IMPORTANCE_PATTERNS)
    if not has_low_signal:
        return False

    has_high_keyword = any(k in combined for k in _POLITICS_HIGH_IMPORTANCE_KEYWORDS)
    return not has_high_keyword


# ── Per-category importance filters ───────────────────────────────────
# Like Sirius Stars: only truly important news. Better to show nothing
# for a day than fill the feed with minor/anecdotal stories.

# ── Mots-cles d'importance par categorie (filtre strict) ───────────────
_CATEGORY_HIGH_IMPORTANCE: dict[str, list[str]] = {
    "astronomy": [
        # FR
        "decouverte", "mission", "lancement", "atterrissage", "exoplanete",
        "trou noir", "asteroide", "comete", "station spatiale", "mars",
        "telescope", "galaxie", "supernova", "fusee", "satellite",
        "nasa", "esa", "spacex", "ariane", "james webb", "hubble",
        "collision", "orbite", "equipage", "astronaute", "cosmonaute",
        # EN
        "discovery", "launch", "landing", "exoplanet", "black hole",
        "asteroid", "comet", "space station", "telescope", "galaxy",
        "supernova", "rocket", "crew", "astronaut", "spacewalk",
        "orbit", "rover", "probe", "cosmic", "gravitational wave",
    ],
    "science_health": [
        # FR
        "decouverte", "etude", "vaccin", "pandemie", "epidemie",
        "traitement", "therapie", "essai clinique", "cancer", "oms",
        "mutation", "virus", "bacterie", "genome", "adn", "arn",
        "greffe", "transplantation", "nobel", "percee", "avancee",
        "intelligence artificielle", "quantique", "fusion nucleaire",
        # EN
        "discovery", "study", "vaccine", "pandemic", "epidemic",
        "treatment", "therapy", "clinical trial", "cancer", "who",
        "mutation", "virus", "genome", "dna", "rna", "breakthrough",
        "transplant", "nobel", "artificial intelligence", "quantum",
        "nuclear fusion", "crispr", "stem cell",
    ],
    "cinema_series": [
        # FR
        "bande-annonce", "trailer", "sortie", "casting", "box-office",
        "record", "oscar", "cesar", "cannes", "festival", "saison",
        "renouvelle", "annule", "premiere", "suite", "reboot",
        "adaptation", "tournage", "production", "streaming",
        # EN
        "trailer", "release", "casting", "box office", "record",
        "oscar", "emmy", "golden globe", "season", "renewed",
        "cancelled", "canceled", "premiere", "sequel", "reboot",
        "adaptation", "production", "streaming", "blockbuster",
    ],
    "sports": [
        # FR
        "victoire", "defaite", "finale", "champion", "titre",
        "transfert", "record", "match", "coupe du monde", "euro",
        "ligue des champions", "jeux olympiques", "medaille",
        "blessure", "suspension", "qualif", "eliminat",
        "classement", "resultat", "prolongation", "penalty",
        # EN
        "victory", "defeat", "final", "champion", "title",
        "transfer", "record", "world cup", "champions league",
        "olympic", "medal", "injury", "suspension", "qualif",
        "eliminat", "standings", "result", "playoff", "knockout",
        "grand slam", "super bowl",
    ],
    "esport": [
        # FR
        "tournoi", "finale", "champion", "equipe", "transfert",
        "qualification", "major", "worlds", "master", "roster",
        # EN
        "tournament", "final", "champion", "roster", "transfer",
        "qualification", "major", "worlds", "playoffs", "grand final",
        "prize pool", "mvp", "esports",
    ],
}

# ── Mots-cles de bruit a rejeter par categorie ─────────────────────────
_CATEGORY_LOW_IMPORTANCE: dict[str, list[str]] = {
    "astronomy": [
        "horoscope", "astrology", "zodiac", "signe astrologique",
        "star gazing tips", "best telescope to buy", "gift guide",
        "wallpaper", "fond d'ecran", "quiz", "top 10", "top 5",
        "listicle", "fun fact", "anecdote", "did you know",
    ],
    "science_health": [
        "diet tip", "regime", "weight loss", "perte de poids",
        "superfood", "detox", "wellness", "bien-etre", "yoga",
        "meditation", "horoscope", "astrology", "self-help",
        "listicle", "top 10", "top 5", "quiz", "fun fact",
        "beauty", "skincare", "anti-aging", "supplement",
    ],
    "cinema_series": [
        "fan theory", "theorie de fan", "meme", "behind the scenes",
        "red carpet", "tapis rouge", "outfit", "fashion",
        "couple", "dating", "breakup", "separation",
        "birthday", "anniversaire", "trivia", "quiz", "fun fact",
        "top 10", "top 5", "listicle", "ranking", "classement des meilleurs",
    ],
    "sports": [
        "wag", "girlfriend", "petit ami", "fashion", "outfit",
        "vacation", "vacance", "birthday", "anniversaire",
        "social media", "reseaux sociaux", "tweet", "instagram",
        "tiktok", "meme", "buzz", "polemique", "clash",
        "top 10", "top 5", "listicle", "quiz", "fun fact",
        "anecdote", "rumor", "rumeur", "gossip",
    ],
    "esport": [
        "meme", "tier list", "skin", "cosmetic", "cosmetique",
        "fan art", "streamer drama", "drama", "controversy",
        "birthday", "anniversaire", "unboxing", "setup",
        "top 10", "top 5", "quiz", "fun fact", "gossip",
    ],
}


def _is_trivial_article(title: str, content: str, category_slug: str) -> bool:
    """Return True if an article is anecdotal / unimportant for its category.

    Strategy:
    1. If the title matches low-importance patterns → suspect
    2. If the title+content doesn't contain any high-importance keyword → reject
    3. Even without low signals, require at least ONE high-importance keyword
       to keep the article. This ensures only significant news passes through.
    """
    if category_slug not in _CATEGORY_HIGH_IMPORTANCE:
        return False  # No filter defined for this category

    title_lower = title.lower()
    content_start = content[:600].lower()
    combined = title_lower + " " + content_start

    high_keywords = _CATEGORY_HIGH_IMPORTANCE[category_slug]
    low_patterns = _CATEGORY_LOW_IMPORTANCE.get(category_slug, [])

    # Check for low-importance signals
    has_low_signal = any(p in title_lower for p in low_patterns)

    # Check for high-importance keywords
    has_high_keyword = any(k in combined for k in high_keywords)

    # If low signal and no high keyword → definitely trivial
    if has_low_signal and not has_high_keyword:
        return True

    # Even without low signal, require a high keyword to pass
    # This is the strict "Sirius Stars" mode: no keyword = not important enough
    if not has_high_keyword:
        return True

    return False


# ── Fonction principale de nettoyage et filtrage ───────────────────────
def clean_and_filter(raw_articles: list[RawArticle]) -> list[RawArticle]:
    """Clean HTML, and filter out noise, clickbait, opinions, and unreliable content."""
    cleaned = []
    filtered_reasons: dict[str, int] = {
        "short_title": 0,
        "clickbait": 0,
        "opinion": 0,
        "no_date": 0,
        "short_content": 0,
        "banned_domain": 0,
        "suspicious": 0,
        "trivial_politics": 0,
        "not_important": 0,
    }

    for article in raw_articles:
        # Skip articles with no title
        if not article.title or len(article.title.strip()) < 10:
            filtered_reasons["short_title"] += 1
            continue

        # Skip banned domains
        if _is_banned_url(article.url):
            filtered_reasons["banned_domain"] += 1
            logger.debug(f"Filtered banned domain: {article.url}")
            continue

        # Skip clickbait
        if is_clickbait(article.title):
            filtered_reasons["clickbait"] += 1
            logger.debug(f"Filtered clickbait: {article.title}")
            continue

        # Skip opinion/editorial
        if is_opinion(article.title, article.tags):
            filtered_reasons["opinion"] += 1
            logger.debug(f"Filtered opinion: {article.title}")
            continue

        # Skip articles with no publication date
        if article.published_at is None:
            filtered_reasons["no_date"] += 1
            continue

        # Clean HTML from content
        article.content = strip_html(article.content)

        # Skip articles with very little content
        if len(article.content.split()) < 20:
            filtered_reasons["short_content"] += 1
            continue

        # Skip suspicious / misleading content
        if _is_suspicious_content(article.title, article.content):
            filtered_reasons["suspicious"] += 1
            logger.debug(f"Filtered suspicious: {article.title}")
            continue

        # Skip trivial politics (gossip, social media drama, unimportant)
        if article.category_slug == "politics" and _is_trivial_politics(
            article.title, article.content
        ):
            filtered_reasons["trivial_politics"] += 1
            logger.debug(f"Filtered trivial politics: {article.title}")
            continue

        # Skip unimportant articles in ALL categories (strict mode)
        if article.category_slug and _is_trivial_article(
            article.title, article.content, article.category_slug
        ):
            filtered_reasons["not_important"] += 1
            logger.debug(f"Filtered not important [{article.category_slug}]: {article.title}")
            continue

        cleaned.append(article)

    logger.info(
        f"Cleaning: {len(raw_articles)} raw -> {len(cleaned)} cleaned "
        f"(filtered: {filtered_reasons})"
    )
    return cleaned
