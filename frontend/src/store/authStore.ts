// ###########################################################################
// # Store Auth — Etat authentification (Zustand + SecureStore)
// # Gere: JWT tokens, user, login/logout/register, refresh auto
// # Tokens stockes dans SecureStore (chiffre sur mobile, localStorage web)
// # Logout: vide TOUS les stores (reactions, bookmarks, quiz history)
// ###########################################################################

import { create } from "zustand";

import { authApi } from "@/services/authApi";
import api, { TokenStorage } from "@/services/api";
import type { User } from "@/types/user";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    await TokenStorage.setItem("access_token", data.access_token);
    await TokenStorage.setItem("refresh_token", data.refresh_token);
    try {
      const { data: user } = await authApi.getMe();
      set({ user, isAuthenticated: true });
    } catch {
      // Tokens saved but getMe failed — still mark as authenticated
      set({ isAuthenticated: true });
    }
  },

  register: async (email, password, displayName) => {
    const { data } = await authApi.register(email, password, displayName);
    await TokenStorage.setItem("access_token", data.access_token);
    await TokenStorage.setItem("refresh_token", data.refresh_token);
    try {
      const { data: user } = await authApi.getMe();
      set({ user, isAuthenticated: true });
    } catch {
      set({ isAuthenticated: true });
    }
  },

  logout: async () => {
    // Clear push token on backend
    try {
      await api.delete("/auth/push-token");
    } catch {}

    // Clear tokens
    await TokenStorage.deleteItem("access_token");
    await TokenStorage.deleteItem("refresh_token");
    set({ user: null, isAuthenticated: false });

    // Clear all user data stores to prevent data leakage between accounts
    // Imports are lazy to avoid circular dependencies
    const { useReactionStore } = require("@/store/reactionStore");
    const { useBookmarkStore } = require("@/store/bookmarkStore");
    const { useQuizHistoryStore } = require("@/store/quizHistoryStore");
    const { useNotificationStore } = require("@/store/notificationStore");
    const { useGamificationStore } = require("@/store/gamificationStore");
    await Promise.all([
      useReactionStore.getState().clearReactions(),
      useBookmarkStore.getState().clearBookmarks(),
      useQuizHistoryStore.getState().clearHistory(),
      useNotificationStore.getState().clearPrefs(),
      useGamificationStore.getState().clearData(),
    ]);
  },

  loadUser: async () => {
    try {
      const token = await TokenStorage.getItem("access_token");
      if (token) {
        // Token present → marquer authentifie immediatement (pas de blocage reseau)
        // L'ecran d'accueil s'affiche tout de suite
        set({ isAuthenticated: true, isLoading: false });

        // Valider le token en arriere-plan (non-bloquant)
        authApi
          .getMe()
          .then(({ data: user }) => {
            set({ user });
          })
          .catch(async (error) => {
            // Only logout if the token is actually invalid (401)
            // NOT on network errors (timeout, no connection, 502, etc.)
            if (error?.response?.status === 401) {
              await TokenStorage.deleteItem("access_token");
              await TokenStorage.deleteItem("refresh_token");
              set({ user: null, isAuthenticated: false });
            }
            // On network errors, silently keep the session alive
          });
      } else {
        // Pas de token → guest, pret immediatement
        set({ isLoading: false });
      }
    } catch {
      // Erreur lecture token → guest
      set({ isLoading: false });
    }
  },
}));
