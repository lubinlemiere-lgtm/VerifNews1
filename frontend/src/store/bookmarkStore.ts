// ###########################################################################
// # Store Bookmarks — Sauvegarde locale + sync backend
// # Local: AsyncStorage (fonctionne sans compte)
// # Sync: API /bookmarks si authentifie
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { ArticleListItem } from "@/types/article";
import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useGamificationStore } from "@/store/gamificationStore";

const STORAGE_KEY = "bookmarked_articles";

interface BookmarkState {
  bookmarks: ArticleListItem[];
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (article: ArticleListItem) => void;
  loadBookmarks: () => Promise<void>;
  clearBookmarks: () => Promise<void>;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],

  isBookmarked: (id: string) => {
    return get().bookmarks.some((b) => b.id === id);
  },

  toggleBookmark: (article: ArticleListItem) => {
    const current = get().bookmarks;
    const exists = current.some((b) => b.id === article.id);
    let updated: ArticleListItem[];

    if (exists) {
      updated = current.filter((b) => b.id !== article.id);
      // Sync with backend
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        api.delete(`/bookmarks/${article.id}`).catch(() => {});
      }
    } else {
      updated = [article, ...current];
      // Sync with backend
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        api.post(`/bookmarks/${article.id}`).catch(() => {});
      }
      // Gamification: points pour favori
      useGamificationStore.getState().addPoints("bookmark");
    }

    set({ bookmarks: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  loadBookmarks: async () => {
    try {
      // Always load local first
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let local: ArticleListItem[] = [];
      try { if (stored) local = JSON.parse(stored); } catch { /* corrupted */ }

      // Try to sync with backend if authenticated
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        try {
          const { data } = await api.get<ArticleListItem[]>("/bookmarks");
          // Merge: backend articles + local-only articles (avoid duplicates)
          const backendIds = new Set(data.map((a) => a.id));
          const localOnly = local.filter((a) => !backendIds.has(a.id));
          const merged = [...data, ...localOnly];

          // Push local-only bookmarks to backend
          for (const article of localOnly) {
            api.post(`/bookmarks/${article.id}`).catch(() => {});
          }

          set({ bookmarks: merged });
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(() => {});
          return;
        } catch {
          // Backend unavailable, use local
        }
      }

      set({ bookmarks: local });
    } catch {
      // Keep empty
    }
  },

  clearBookmarks: async () => {
    set({ bookmarks: [] });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
