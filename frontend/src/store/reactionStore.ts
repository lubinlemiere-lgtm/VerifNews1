// ###########################################################################
// # Store Reactions — Like/Dislike local par article
// # Stockage: AsyncStorage. Re-cliquer = annuler la reaction
// # getReaction(id): retourne "like" | "dislike" | null
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const STORAGE_KEY = "article_reactions";

type Reaction = "like" | "dislike" | null;

interface ReactionState {
  reactions: Record<string, Reaction>;
  getReaction: (articleId: string) => Reaction;
  setReaction: (articleId: string, reaction: Reaction) => void;
  loadReactions: () => Promise<void>;
  clearReactions: () => Promise<void>;
}

export const useReactionStore = create<ReactionState>((set, get) => ({
  reactions: {},

  getReaction: (articleId: string) => {
    return get().reactions[articleId] || null;
  },

  setReaction: (articleId: string, reaction: Reaction) => {
    const current = get().reactions;
    const currentReaction = current[articleId] || null;

    // Toggle off if same reaction
    const newReaction = currentReaction === reaction ? null : reaction;

    const updated = { ...current };
    if (newReaction === null) {
      delete updated[articleId];
    } else {
      updated[articleId] = newReaction;
    }

    set({ reactions: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  loadReactions: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try { set({ reactions: JSON.parse(stored) }); } catch { /* corrupted */ }
      }
    } catch {
      // Keep empty
    }
  },

  clearReactions: async () => {
    set({ reactions: {} });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
