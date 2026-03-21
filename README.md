# VerifNews

**Application mobile de news 100% verifiees** — chaque article est valide par croisement de 2+ sources fiables.

Zero clickbait. Zero fake news. Que de l'info verifiee.

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React Native (Expo SDK 52), TypeScript, Expo Router v4, Zustand 5, TanStack Query 5 |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 async, PostgreSQL 16 |
| **IA / NLP** | pgvector, sentence-transformers (all-MiniLM-L6-v2), recherche semantique |
| **Audio** | Edge TTS (text-to-speech gratuit), expo-av |
| **Notifications** | expo-notifications, Expo Push API, APScheduler |
| **Securite** | bcrypt, JWT blacklist, refresh token rotation |
| **Email** | Gmail SMTP (aiosmtplib) |
| **Build** | EAS Build (Expo Application Services) |

---

## Fonctionnalites

### Actualites verifiees
- **Verification croisee** — Un article n'est publie que s'il est confirme par 2+ sources independantes (cosine similarity > 0.75)
- **Recherche semantique** — Recherche par sens grace aux embeddings vectoriels
- **Mode audio** — Ecoute les articles en TTS avec vitesse reglable
- **Categories** — Astronomie, Science & Sante, Cinema, Sport, Esport, Politique

### Quiz & Gamification
- **2 quiz par semaine** — Rotation automatique des categories (lundi + jeudi)
- **Quiz Culture Generale** — Le dernier vendredi de chaque mois
- **15 questions** par quiz avec 3 niveaux de difficulte + fun facts
- **Systeme de points** — Lecture (+5), quiz (+20), streak (+10), partage (+5)
- **Niveaux et badges** — Progression, Expert categorie, Champion mensuel

### Experience utilisateur
- **Notifications push** — Breaking news, resume quotidien, rappels quiz
- **Dark mode** — Theme sombre/clair automatique ou manuel
- **Multilingue** — Francais / Anglais avec detection automatique
- **Taille de texte** — 4 niveaux d'accessibilite
- **Mode invites** — Lecture libre sans compte
- **Bookmarks & Reactions** — Like/dislike et sauvegarde d'articles

---

## Architecture

```
verifnews/
├── backend/                # API FastAPI
│   ├── app/api/v1/         # Endpoints REST (auth, feed, articles, quiz, tts, preferences)
│   ├── app/models/         # SQLAlchemy (user, article, source, quiz, token_blacklist)
│   ├── app/pipeline/       # Ingestion RSS, NLP, cross-verification, scheduler
│   ├── app/services/       # auth, feed, tts, embedding, quiz, notification, email
│   └── alembic/            # Migrations BDD
│
├── frontend/               # App React Native / Expo
│   ├── app/                # Expo Router (file-based routing)
│   │   ├── (auth)/         # Login, register, forgot-password
│   │   ├── (tabs)/         # Feed, Quiz, Bookmarks
│   │   ├── article/[id]    # Detail article
│   │   └── quiz/[id]       # Quiz interactif
│   ├── src/components/     # NewsCard, AudioPlayer, QuizCard, ProofBadge...
│   ├── src/hooks/          # useAuth, useFeed, useAudio, useNotifications...
│   ├── src/store/          # Zustand (auth, bookmarks, reactions, gamification, theme)
│   └── src/i18n/           # Traductions FR/EN
│
└── docker-compose.yml      # PostgreSQL 16 + pgvector
```

---

## Securite

- **bcrypt** pour le hachage des mots de passe
- **JWT** avec access + refresh tokens + **blacklist** (revocation au logout)
- **Refresh token rotation** avec invalidation de l'ancien token
- **Rate limiting** par IP sur les endpoints sensibles
- **Requetes SQL parametrees** (zero injection)
- **Validation** email (regex) + mot de passe (8 chars, lettres + chiffres)
- **Anti-enumeration** sur forgot-password (toujours 200 OK)
- **SecureStore** sur mobile pour les tokens (chiffre)
- **Push tokens** valides au format Expo uniquement

---

## Pipeline de verification

```
Sources RSS → Fetch → Clean → NLP (embeddings) → Dedup → Cross-verify → Store
                                                           ↓
                                                 2+ sources concordantes
                                                 cosine similarity > 0.75
                                                           ↓
                                                     Article verifie ✓
```

Le pipeline tourne automatiquement toutes les 30 minutes via APScheduler.

---

## Lancer le projet

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker (pour PostgreSQL) ou PostgreSQL installe localement
- Expo CLI

### Backend
```bash
cd backend
docker-compose up -d                    # PostgreSQL + pgvector
pip install -e .                        # Dependencies
alembic upgrade head                    # Migrations
python scripts/seed_categories.py       # Categories
python scripts/seed_sources.py          # Sources RSS
uvicorn app.main:app --reload           # API sur :8000
```

### Frontend
```bash
cd frontend
npm install
npx expo start                          # Dev server
```

### Build APK
```bash
cd frontend
npx eas-cli build -p android --profile preview     # APK test
npx eas-cli build -p android --profile production   # AAB Play Store
```

---

## Auteur

**Lubin Lemiere** — Developpeur fullstack

---

*Projet realise avec React Native, FastAPI, PostgreSQL et pgvector.*
