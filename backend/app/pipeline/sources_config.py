# ###########################################################################
# # Sources Config — Liste blanche des sources RSS par categorie
# # Chaque source a: name, url, type, reliability_tier, country_code
# # Tier 1: agences (Reuters, AP) / Tier 2: grands medias / Tier 3: fiables
# ###########################################################################

"""Whitelisted sources organized by category.

TRUST POLICY:
- Tier 1: Official institutional sources (government agencies, international orgs, wire services)
- Tier 2: Major established media with editorial standards and fact-checking
- NO tabloids, NO opinion-only outlets, NO social media aggregators
- Every source must have a verifiable editorial team and correction policy
- Minimum 3 sources per category to enable cross-verification
"""

WHITELISTED_SOURCES: dict[str, list[dict]] = {
    "astronomy": [
        # Tier 1: Official space agencies
        {"name": "NASA Breaking News", "url": "https://www.nasa.gov/rss/dyn/breaking_news.rss", "type": "rss", "tier": 1},
        {"name": "ESA Top News", "url": "https://www.esa.int/rssfeed/Our_Activities/Space_Science", "type": "rss", "tier": 1},
        # Tier 2: Established science media (EN)
        {"name": "Space.com", "url": "https://www.space.com/feeds/all", "type": "rss", "tier": 2},
        {"name": "Sky & Telescope", "url": "https://skyandtelescope.org/feed/", "type": "rss", "tier": 2},
        {"name": "Astronomy.com", "url": "https://www.astronomy.com/feed/", "type": "rss", "tier": 2},
        # Tier 2: Sources francophones
        {"name": "Futura Espace", "url": "https://www.futura-sciences.com/rss/espace/actualites.xml", "type": "rss", "tier": 2},
        {"name": "Ciel & Espace", "url": "https://www.cieletespace.fr/feed", "type": "rss", "tier": 2},
    ],
    "science_health": [
        # Tier 1: Institutional sources
        {"name": "WHO News", "url": "https://www.who.int/rss-feeds/news-english.xml", "type": "rss", "tier": 1},
        {"name": "Nature News", "url": "https://www.nature.com/nature.rss", "type": "rss", "tier": 1},
        {"name": "Science Magazine", "url": "https://www.science.org/rss/news_current.xml", "type": "rss", "tier": 1},
        # Tier 2: Established science media (EN)
        {"name": "Science Daily", "url": "https://www.sciencedaily.com/rss/all.xml", "type": "rss", "tier": 2},
        {"name": "New Scientist", "url": "https://www.newscientist.com/feed/home/", "type": "rss", "tier": 2},
        {"name": "Phys.org", "url": "https://phys.org/rss-feed/", "type": "rss", "tier": 2},
        {"name": "Medical News Today", "url": "https://www.medicalnewstoday.com/newsrss", "type": "rss", "tier": 2},
        # Tier 2: Sources francophones
        {"name": "Futura Sciences", "url": "https://www.futura-sciences.com/rss/actualites.xml", "type": "rss", "tier": 2},
        {"name": "INSERM Actualites", "url": "https://www.inserm.fr/feed/", "type": "rss", "tier": 2},
    ],
    "cinema_series": [
        # Tier 1: Industry data
        {"name": "TMDB Trending", "url": "https://api.themoviedb.org/3/trending/all/week", "type": "api", "tier": 1},
        # Tier 2: Major entertainment trade press (EN)
        {"name": "Variety", "url": "https://variety.com/feed/", "type": "rss", "tier": 2},
        {"name": "Hollywood Reporter", "url": "https://www.hollywoodreporter.com/feed/", "type": "rss", "tier": 2},
        {"name": "Deadline", "url": "https://deadline.com/feed/", "type": "rss", "tier": 2},
        {"name": "IndieWire", "url": "https://www.indiewire.com/feed/", "type": "rss", "tier": 2},
        # Tier 2: Sources francophones
        {"name": "AlloCine", "url": "https://www.allocine.fr/rss/news.xml", "type": "rss", "tier": 2},
        {"name": "Premiere", "url": "https://www.premiere.fr/rss/actu-cinema", "type": "rss", "tier": 2},
    ],
    "sports": [
        # Tier 2: Major sports media (EN)
        {"name": "ESPN Top Headlines", "url": "https://www.espn.com/espn/rss/news", "type": "rss", "tier": 2},
        {"name": "BBC Sport", "url": "https://feeds.bbci.co.uk/sport/rss.xml", "type": "rss", "tier": 2},
        {"name": "Sky Sports News", "url": "https://www.skysports.com/rss/12040", "type": "rss", "tier": 2},
        {"name": "ESPN FC (Football)", "url": "https://www.espn.com/espn/rss/soccer/news", "type": "rss", "tier": 2},
        {"name": "BBC Sport Football", "url": "https://feeds.bbci.co.uk/sport/football/rss.xml", "type": "rss", "tier": 2},
        # Tier 2: Sources francophones
        {"name": "L'Equipe", "url": "https://www.lequipe.fr/rss/actu_rss.xml", "type": "rss", "tier": 2},
        {"name": "RMC Sport", "url": "https://rmcsport.bfmtv.com/rss/fil-sport/", "type": "rss", "tier": 2},
    ],
    "esport": [
        # Tier 2: Esport media (EN)
        {"name": "Dexerto", "url": "https://www.dexerto.com/feed/", "type": "rss", "tier": 2},
        {"name": "Dot Esports", "url": "https://dotesports.com/feed", "type": "rss", "tier": 2},
        {"name": "The Esports Observer", "url": "https://archive.esportsobserver.com/feed/", "type": "rss", "tier": 2},
        # Tier 2: Source francophone
        {"name": "Millenium", "url": "https://www.millenium.org/feed/home.xml", "type": "rss", "tier": 2},
    ],
    "politics": [
        # Tier 1: Wire services (factual, no editorial slant)
        {"name": "Reuters World", "url": "https://news.google.com/rss/search?q=site:reuters.com+world&hl=en", "type": "rss", "tier": 1},
        {"name": "AP News World", "url": "https://news.google.com/rss/search?q=site:apnews.com+world&hl=en", "type": "rss", "tier": 1},
        # Tier 2: Major public broadcasters (EN — editorial independence mandated)
        {"name": "BBC World News", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "type": "rss", "tier": 2},
        {"name": "France 24 English", "url": "https://www.france24.com/en/rss", "type": "rss", "tier": 2},
        {"name": "Al Jazeera English", "url": "https://www.aljazeera.com/xml/rss/all.xml", "type": "rss", "tier": 2},
        {"name": "DW News", "url": "https://rss.dw.com/rdf/rss-en-all", "type": "rss", "tier": 2},
        # Tier 2: Sources francophones
        {"name": "France Info Monde", "url": "https://www.francetvinfo.fr/monde.rss", "type": "rss", "tier": 2},
        {"name": "Le Monde International", "url": "https://www.lemonde.fr/international/rss_full.xml", "type": "rss", "tier": 2},
    ],
}

# Sources explicitly BANNED (unreliable, clickbait, propaganda, or conspiracy)
BANNED_DOMAINS = [
    "infowars.com",
    "breitbart.com",
    "dailymail.co.uk",
    "thesun.co.uk",
    "nypost.com",
    "rt.com",
    "sputniknews.com",
    "naturalcures.com",
    "beforeitsnews.com",
    "worldnewsdailyreport.com",
    "theonion.com",
    "babylonbee.com",
]

CATEGORIES_META = {
    "astronomy": {"name": "Astronomie", "icon": "telescope", "description": "Missions spatiales, exoplanetes et astrophysique"},
    "science_health": {"name": "Science & Sante", "icon": "flask", "description": "Etudes cliniques, decouvertes et sante publique"},
    "cinema_series": {"name": "Cinema & Series", "icon": "film", "description": "Sorties officielles, castings et box-office"},
    "sports": {"name": "Sport", "icon": "football-outline", "description": "Resultats, transferts et competitions"},
    "esport": {"name": "Esport", "icon": "game-controller-outline", "description": "Tournois, equipes et jeux competitifs"},
    "politics": {"name": "Politique", "icon": "landmark", "description": "Geopolitique, institutions et legislation"},
}
