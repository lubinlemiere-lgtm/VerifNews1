# VerifNews - Project Guide

## Overview
App mobile de news 100% verifiees. Chaque article est valide par 2+ sources fiables (whitelist uniquement).
Stack: FastAPI + React Native (Expo 52) + PostgreSQL/pgvector.

## Project Structure
```
verifnews/
├── backend/          # FastAPI API + pipeline d'ingestion
│   ├── app/
│   │   ├── api/v1/   # Endpoints: auth, feed, articles, categories, tts, quiz, preferences
│   │   ├── models/   # SQLAlchemy: user, article, source, category, quiz, verification, audio_cache
│   │   ├── pipeline/ # Ingestion RSS, NLP, cross-verification, deduplication, scheduler
│   │   ├── services/ # auth, feed, tts, embedding, quiz, verification
│   │   ├── schemas/  # Pydantic request/response
│   │   └── utils/    # security, rate_limiter, text_processing, vector_ops
│   ├── scripts/      # seed_sources, seed_categories, run_pipeline
│   ├── tests/        # pytest + pytest-asyncio
│   └── docker-compose.yml  # PostgreSQL + pgvector (pg16)
│
└── frontend/         # React Native / Expo 52
    ├── app/          # Expo Router (file-based routing)
    │   ├── (auth)/   # login, register
    │   ├── (tabs)/   # home, search, categories, bookmarks, profile
    │   ├── article/[id].tsx
    │   └── quiz/[id].tsx
    ├── src/
    │   ├── components/  # NewsCard, ProofBadge, AudioPlayer, QuizCard, NewsFeed, etc.
    │   ├── hooks/       # useAuth, useFeed, useArticle, useAudio, useCategories, useSearch
    │   ├── services/    # Axios API clients (api, authApi, feedApi, articleApi, quizApi, ttsApi)
    │   ├── store/       # Zustand (authStore, preferencesStore, bookmarkStore, themeStore, reactionStore)
    │   ├── constants/   # colors, categories, config
    │   └── types/       # TypeScript interfaces
    └── assets/images/
```

## Tech Stack

### Backend
- Python 3.11+, FastAPI 0.115+, Uvicorn
- SQLAlchemy 2.0+ async + AsyncPG (PostgreSQL)
- pgvector pour recherche semantique (embeddings)
- Alembic pour migrations BDD
- sentence-transformers (all-MiniLM-L6-v2) pour embeddings
- Edge TTS (gratuit) pour text-to-speech
- APScheduler pour le pipeline periodique
- feedparser + httpx pour ingestion RSS/API

### Frontend
- Expo SDK 52, React Native 0.76.9
- Expo Router ~4.0 (file-based routing)
- TypeScript strict mode
- Zustand 5.0 (state management)
- React Query / TanStack Query 5.60 (data fetching)
- Axios (HTTP client) - IMPORTANT: utilise le browser build (voir metro.config.js)
- expo-secure-store pour tokens JWT

### Infrastructure
- PostgreSQL 16 + pgvector (docker-compose)
- EAS Build pour APK/AAB (Expo Application Services)
- Expo account: lubin50 (lubinlemiere@gmail.com)
- EAS Project ID: 508a8a1d-04db-411f-8f5b-30b7fcbcc3c0
- Package Android: com.verifnews.app (NE PAS CHANGER - identifiant Play Store)

## Critical Build Notes (EAS / APK)

### Problemes resolus (ne pas reproduire)

1. **splash screen image OBLIGATOIRE** - Si `expo-splash-screen` est dans les deps,
   `app.json > expo > splash` DOIT avoir `"image": "./assets/images/icon.png"`.
   Sans ca: erreur Gradle `resource drawable/splashscreen_logo not found`.
   C'est la cause #1 des echecs de build.

2. **axios + React Native** - axios essaie d'utiliser des modules Node.js (crypto, url, http).
   Solution dans `metro.config.js`: forcer `axios/dist/browser/axios.cjs` et stub les builtins Node.

3. **newArchEnabled = false** - La nouvelle architecture React Native cause des erreurs codegen
   avec certains packages natifs. Garder `"newArchEnabled": false` dans app.json.

4. **node_modules JAMAIS dans git** - Le .gitignore doit exister AVANT le premier commit.
   Si deja commis: `git rm -r --cached node_modules/`

5. **Modules natifs restaures** (mars 2026):
   - `expo-av` — RESTAURE (AudioPlayer.tsx et useAudio.ts fonctionnels)
   - `expo-notifications` + `expo-device` — RESTAURE (notificationService.ts complet, plugin dans app.json)
   - `react-native-google-mobile-ads` — RESTAURE (AdBanner.tsx avec import conditionnel, plugin dans app.json). ATTENTION: les App IDs dans app.json sont des placeholders (XXXXXXXX), remplacer par les vrais IDs AdMob avant le build prod. Necessite google-services.json.

6. **eas.json** doit rester simple. Ne pas ajouter:
   - `GRADLE_OPTS` ou `gradleCommand` custom
   - `appVersionSource: "remote"` (cause des warnings)
   - Section `submit` sans google-services.json

7. **Proprietes invalides dans app.json android**: ne pas mettre `usesCleartextTraffic`
   directement - utiliser un plugin Expo si necessaire.

### Commandes de build
```bash
cd frontend
npx eas-cli login          # Se connecter a Expo
npx eas-cli build -p android --profile preview   # APK de test
npx eas-cli build -p android --profile production # AAB pour Play Store
```

## Development Commands
```bash
# Backend
cd backend
docker-compose up -d                    # Demarrer PostgreSQL
alembic upgrade head                    # Appliquer migrations
python scripts/seed_categories.py       # Seeder les categories
python scripts/seed_sources.py          # Seeder les sources
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npx expo start                          # Dev server
npx expo start --android                # Directement sur Android
```

## Key Design Decisions
- Verification croisee: un article doit etre confirme par 2+ sources distinctes (cosine sim > 0.75)
- Deduplication: cosine distance < 0.15 entre embeddings
- Sources whitelistees uniquement (pas de scraping web generique)
- TTS a la demande avec cache disque (Edge TTS gratuit)
- Pipeline toutes les 30 minutes via APScheduler
- JWT auth avec refresh tokens stockes dans expo-secure-store

## Path Aliases
- Frontend: `@/*` -> `./src/*` (configure dans tsconfig.json)
