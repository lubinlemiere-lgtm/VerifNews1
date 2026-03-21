// ###########################################################################
// # Quiz History Store — Historique local + badges + streaks
// # Badges: Expert (80%+ x3 dans une categorie), Streak (5+ semaines)
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "quiz_history";

export interface QuizHistoryEntry {
  quizId: number;
  quizType: "weekly" | "monthly";
  categorySlug: string | null;
  categoryName: string | null;
  score: number;
  total: number;
  percentage: number;
  durationSeconds: number | null;
  playedAt: string; // ISO date
}

export type BadgeType = "streak5" | "streak10" | "expert" | "monthlyChamp" | "perfect";

export interface Badge {
  type: BadgeType;
  label: string;
  category?: string; // for "expert" badge
  earnedAt: string;
}

interface QuizHistoryState {
  history: QuizHistoryEntry[];
  loadHistory: () => Promise<void>;
  addEntry: (entry: Omit<QuizHistoryEntry, "playedAt" | "percentage">) => void;
  clearHistory: () => Promise<void>;
  getStats: () => {
    totalPlayed: number;
    averageScore: number;
    bestScore: number;
    streakWeeks: number;
  };
  getCategoryStats: (slug: string) => {
    played: number;
    average: number;
    best: number;
  };
  getBadges: () => Badge[];
}

export const useQuizHistoryStore = create<QuizHistoryState>((set, get) => ({
  history: [],

  loadHistory: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try { set({ history: JSON.parse(raw) }); } catch { /* corrupted */ }
      }
    } catch {
      // ignore
    }
  },

  clearHistory: async () => {
    set({ history: [] });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },

  addEntry: (entry) => {
    const newEntry: QuizHistoryEntry = {
      ...entry,
      percentage: Math.round((entry.score / entry.total) * 100),
      playedAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...get().history];
    set({ history: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  getStats: () => {
    const { history } = get();
    if (history.length === 0) {
      return { totalPlayed: 0, averageScore: 0, bestScore: 0, streakWeeks: 0 };
    }

    const totalPlayed = history.length;
    const averageScore = Math.round(
      history.reduce((sum, h) => sum + h.percentage, 0) / totalPlayed
    );
    const bestScore = Math.max(...history.map((h) => h.percentage));

    // Calculate weekly streak
    const now = new Date();
    let streakWeeks = 0;
    let checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
    for (let w = 0; w < 52; w++) {
      const weekStart = new Date(checkDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const hasQuiz = history.some((h) => {
        const d = new Date(h.playedAt);
        return d >= weekStart && d < weekEnd;
      });

      if (hasQuiz) {
        streakWeeks++;
        checkDate.setDate(checkDate.getDate() - 7);
      } else {
        break;
      }
    }

    return { totalPlayed, averageScore, bestScore, streakWeeks };
  },

  getCategoryStats: (slug: string) => {
    const entries = get().history.filter((h) => h.categorySlug === slug);
    if (entries.length === 0) return { played: 0, average: 0, best: 0 };
    return {
      played: entries.length,
      average: Math.round(
        entries.reduce((sum, e) => sum + e.percentage, 0) / entries.length
      ),
      best: Math.max(...entries.map((e) => e.percentage)),
    };
  },

  getBadges: () => {
    const { history } = get();
    const badges: Badge[] = [];

    // Streak badges
    const stats = get().getStats();
    if (stats.streakWeeks >= 10) {
      badges.push({ type: "streak10", label: "badge.weeks10", earnedAt: new Date().toISOString() });
    } else if (stats.streakWeeks >= 5) {
      badges.push({ type: "streak5", label: "badge.weeks5", earnedAt: new Date().toISOString() });
    }

    // Expert badges (80%+ x3 in a category)
    const catCounts: Record<string, number> = {};
    for (const entry of history) {
      if (entry.categorySlug && entry.percentage >= 80) {
        catCounts[entry.categorySlug] = (catCounts[entry.categorySlug] || 0) + 1;
      }
    }
    for (const [slug, count] of Object.entries(catCounts)) {
      if (count >= 3) {
        const catEntry = history.find((h) => h.categorySlug === slug);
        badges.push({
          type: "expert",
          label: `badge.expert`,
          category: slug,
          earnedAt: new Date().toISOString(),
        });
      }
    }

    // Perfect score badge
    if (history.some((h) => h.percentage === 100)) {
      badges.push({ type: "perfect", label: "badge.perfectScore", earnedAt: new Date().toISOString() });
    }

    // Monthly champ (90%+ on monthly quiz)
    if (history.some((h) => h.quizType === "monthly" && h.percentage >= 90)) {
      badges.push({ type: "monthlyChamp", label: "badge.monthlyChamp", earnedAt: new Date().toISOString() });
    }

    return badges;
  },
}));
