// ###########################################################################
// # notificationStore — Préférences de notifications
// # Stocke les choix utilisateur: breaking news, daily digest, quiz rappels
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";

// ── Constantes et interfaces ────────────────────────────────────────
const STORAGE_KEY = "notification_prefs";

interface NotificationPrefs {
  breakingNews: boolean;
  dailyDigest: boolean;
  quizReminders: boolean;
  categoryAlerts: boolean;
}

interface NotificationStore extends NotificationPrefs {
  loaded: boolean;
  loadPrefs: () => Promise<void>;
  togglePref: (key: keyof NotificationPrefs) => Promise<void>;
  clearPrefs: () => Promise<void>;
}

// ── Valeurs par defaut ──────────────────────────────────────────────
const DEFAULTS: NotificationPrefs = {
  breakingNews: true,
  dailyDigest: true,
  quizReminders: false,
  categoryAlerts: true,
};

// ── Store Zustand ───────────────────────────────────────────────────
export const useNotificationStore = create<NotificationStore>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  // ── Chargement depuis AsyncStorage ──────────────────────────────
  loadPrefs: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ ...DEFAULTS, ...parsed, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  // ── Basculer une preference (local + sync backend) ──────────────
  togglePref: async (key) => {
    const current = get()[key];
    set({ [key]: !current } as any);

    // Persist
    const { breakingNews, dailyDigest, quizReminders, categoryAlerts } = {
      ...get(),
      [key]: !current,
    };
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ breakingNews, dailyDigest, quizReminders, categoryAlerts }),
    ).catch(() => {});

    // Sync to backend if authenticated
    const isAuth = useAuthStore.getState().isAuthenticated;
    if (isAuth) {
      api.put("/preferences/notify", {
        pref_key: key,
        enabled: !current,
      }).catch(() => {});
    }
  },

  // ── Reinitialisation ─────────────────────────────────────────────
  clearPrefs: async () => {
    set({ ...DEFAULTS });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
