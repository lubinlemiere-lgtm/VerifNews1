// ###########################################################################
// # Store Gamification — Systeme de points et niveaux
// # Local: AsyncStorage (fonctionne sans compte)
// # Sync backend: a venir plus tard
// # Points: lecture (+5), quiz (+10 base + bonus), streak (+10),
// #         partage (+5), favori (+2)
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// ── Constantes et types ─────────────────────────────────────────────
const STORAGE_KEY = "gamification_data";

export type PointAction = "read" | "quiz" | "streak" | "share" | "bookmark";

const POINT_VALUES: Record<PointAction, number> = {
  read: 5,
  quiz: 10,    // base, bonus ajoute separement
  streak: 10,
  share: 5,
  bookmark: 2,
};

export interface Level {
  key: string;
  minPoints: number;
  labelFr: string;
  labelEn: string;
}

export const LEVELS: Level[] = [
  { key: "beginner", minPoints: 0, labelFr: "Debutant", labelEn: "Beginner" },
  { key: "reader", minPoints: 100, labelFr: "Lecteur", labelEn: "Reader" },
  { key: "expert", minPoints: 500, labelFr: "Expert", labelEn: "Expert" },
  { key: "master", minPoints: 1000, labelFr: "Maitre", labelEn: "Master" },
  { key: "legend", minPoints: 2500, labelFr: "Legende", labelEn: "Legend" },
];

// ── Interfaces d'etat ───────────────────────────────────────────────
// Donnees persistees dans AsyncStorage
interface PersistedData {
  totalPoints: number;
  weeklyPoints: number;
  streakDays: number;
  lastActiveDate: string | null;
  articlesReadToday: string[];
  articlesReadDate: string | null;
}

interface GamificationState {
  totalPoints: number;
  weeklyPoints: number;
  streakDays: number;
  lastActiveDate: string | null;
  articlesReadToday: string[];
  articlesReadDate: string | null;

  // Actions
  addPoints: (action: PointAction, bonus?: number) => void;
  checkStreak: () => void;
  markArticleRead: (articleId: string) => void;
  getLevel: () => Level;
  getNextLevel: () => Level | null;
  getProgressToNextLevel: () => number;
  loadData: () => Promise<void>;
  clearData: () => Promise<void>;
}

// ── Fonctions utilitaires ────────────────────────────────────────────
function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function persist(state: GamificationState) {
  const data: PersistedData = {
    totalPoints: state.totalPoints,
    weeklyPoints: state.weeklyPoints,
    streakDays: state.streakDays,
    lastActiveDate: state.lastActiveDate,
    articlesReadToday: state.articlesReadToday,
    articlesReadDate: state.articlesReadDate,
  };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
}

// ── Store Zustand ───────────────────────────────────────────────────
export const useGamificationStore = create<GamificationState>((set, get) => ({
  totalPoints: 0,
  weeklyPoints: 0,
  streakDays: 0,
  lastActiveDate: null,
  articlesReadToday: [],
  articlesReadDate: null,

  // ── Actions: ajout de points ─────────────────────────────────────
  addPoints: (action, bonus = 0) => {
    const pts = POINT_VALUES[action] + bonus;
    set((state) => {
      const updated = {
        ...state,
        totalPoints: state.totalPoints + pts,
        weeklyPoints: state.weeklyPoints + pts,
      };
      // Persist apres update
      setTimeout(() => persist(get()), 0);
      return updated;
    });
  },

  // ── Actions: gestion du streak quotidien ─────────────────────────
  checkStreak: () => {
    const today = getTodayISO();
    const { lastActiveDate, streakDays } = get();

    if (lastActiveDate === today) {
      // Deja actif aujourd'hui, rien a faire
      return;
    }

    // Calculer si c'etait hier
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split("T")[0];

    if (lastActiveDate === yesterdayISO) {
      // Jour consecutif — incrementer streak + donner points
      const newStreak = streakDays + 1;
      set({ streakDays: newStreak, lastActiveDate: today });
      // Donner les points de streak
      get().addPoints("streak");
    } else {
      // Streak casse ou premiere utilisation — reset a 1
      set({ streakDays: 1, lastActiveDate: today });
    }

    persist(get());
  },

  // ── Actions: marquer un article comme lu ─────────────────────────
  markArticleRead: (articleId) => {
    const today = getTodayISO();
    const state = get();

    // Si la date a change, reset la liste du jour
    let todayArticles = state.articlesReadToday;
    if (state.articlesReadDate !== today) {
      todayArticles = [];
    }

    // Si l'article est deja lu aujourd'hui, ne pas re-donner de points
    if (todayArticles.includes(articleId)) {
      return;
    }

    const updated = [...todayArticles, articleId];
    set({
      articlesReadToday: updated,
      articlesReadDate: today,
    });

    // Donner les points de lecture
    get().addPoints("read");
  },

  // ── Getters: calcul du niveau et progression ─────────────────────
  getLevel: () => {
    const { totalPoints } = get();
    let current = LEVELS[0];
    for (const level of LEVELS) {
      if (totalPoints >= level.minPoints) {
        current = level;
      }
    }
    return current;
  },

  getNextLevel: () => {
    const current = get().getLevel();
    const idx = LEVELS.findIndex((l) => l.key === current.key);
    if (idx < LEVELS.length - 1) {
      return LEVELS[idx + 1];
    }
    return null;
  },

  getProgressToNextLevel: () => {
    const { totalPoints } = get();
    const current = get().getLevel();
    const next = get().getNextLevel();
    if (!next) return 1; // Niveau max atteint

    const range = next.minPoints - current.minPoints;
    const progress = totalPoints - current.minPoints;
    return Math.min(1, Math.max(0, progress / range));
  },

  // ── Persistance: chargement et reinitialisation ──────────────────
  loadData: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: PersistedData = JSON.parse(stored);
        set({
          totalPoints: data.totalPoints ?? 0,
          weeklyPoints: data.weeklyPoints ?? 0,
          streakDays: data.streakDays ?? 0,
          lastActiveDate: data.lastActiveDate ?? null,
          articlesReadToday: data.articlesReadToday ?? [],
          articlesReadDate: data.articlesReadDate ?? null,
        });
      }
    } catch {
      // Donnees corrompues, on garde les valeurs par defaut
    }
  },

  clearData: async () => {
    set({
      totalPoints: 0,
      weeklyPoints: 0,
      streakDays: 0,
      lastActiveDate: null,
      articlesReadToday: [],
      articlesReadDate: null,
    });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
