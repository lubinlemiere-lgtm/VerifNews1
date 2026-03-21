// ###########################################################################
// # Store Preferences — Categories, abonnements, pays, categorie par defaut, TTS
// # Pays: persiste en local (AsyncStorage) + sync API si connecte
// # Categories: chargees depuis l'API, abonnements via updateSubscriptions
// # Categorie par defaut: "all", "favorites", ou un slug specifique
// # TTS Speed: vitesse de lecture audio (0.75, 1, 1.25, 1.5)
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { preferencesApi } from "@/services/preferencesApi";
import type { Category, PreferenceItem } from "@/types/category";

// ── Cles AsyncStorage ───────────────────────────────────────────────
const COUNTRY_KEY = "selected_country";
const DEFAULT_CATEGORY_KEY = "default_category";
const TTS_SPEED_KEY = "tts_speed";

// # Fallback categories — utilisees si le backend est indisponible
const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, slug: "astronomy", name: "Astronomie", icon: "planet-outline", description: "Missions spatiales, exoplanetes et astrophysique" },
  { id: 2, slug: "science_health", name: "Science & Sante", icon: "flask-outline", description: "Etudes cliniques, decouvertes et sante publique" },
  { id: 3, slug: "cinema_series", name: "Cinema & Series", icon: "film-outline", description: "Sorties officielles, castings et box-office" },
  { id: 4, slug: "sports", name: "Sport", icon: "football-outline", description: "Resultats, transferts et competitions" },
  { id: 5, slug: "esport", name: "Esport", icon: "game-controller-outline", description: "Tournois, equipes et jeux competitifs" },
  { id: 6, slug: "politics", name: "Politique", icon: "earth-outline", description: "Geopolitique, institutions et legislation" },
];

// ── Interface d'etat ────────────────────────────────────────────────
interface PreferencesState {
  categories: Category[];
  preferences: PreferenceItem[];
  selectedCountry: string;
  defaultCategory: string;
  ttsSpeed: number;
  loadCategories: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  loadCountry: () => Promise<void>;
  loadDefaultCategory: () => Promise<void>;
  loadTtsSpeed: () => Promise<void>;
  updateSubscriptions: (categoryIds: number[]) => Promise<void>;
  setCountry: (code: string) => Promise<void>;
  setDefaultCategory: (slug: string) => Promise<void>;
  setTtsSpeed: (speed: number) => Promise<void>;
}

// ── Store Zustand ───────────────────────────────────────────────────
export const usePreferencesStore = create<PreferencesState>((set) => ({
  categories: [],
  preferences: [],
  selectedCountry: "FR",
  defaultCategory: "all",
  ttsSpeed: 1,

  // ── Chargement des donnees depuis API / AsyncStorage ────────────
  loadCategories: async () => {
    try {
      const { data } = await preferencesApi.getCategories();
      set({ categories: data });
    } catch {
      set((state) => ({
        categories: state.categories.length === 0 ? DEFAULT_CATEGORIES : state.categories,
      }));
    }
  },

  loadPreferences: async () => {
    try {
      const { data } = await preferencesApi.getPreferences();
      set({ preferences: data });
    } catch {}
  },

  loadCountry: async () => {
    try {
      const stored = await AsyncStorage.getItem(COUNTRY_KEY);
      if (stored) set({ selectedCountry: stored });
    } catch {}
  },

  loadDefaultCategory: async () => {
    try {
      const stored = await AsyncStorage.getItem(DEFAULT_CATEGORY_KEY);
      if (stored) set({ defaultCategory: stored });
    } catch {}
  },

  loadTtsSpeed: async () => {
    try {
      const stored = await AsyncStorage.getItem(TTS_SPEED_KEY);
      if (stored) {
        const speed = parseFloat(stored);
        if ([0.75, 1, 1.25, 1.5].includes(speed)) {
          set({ ttsSpeed: speed });
        }
      }
    } catch {}
  },

  // ── Actions de mise a jour ─────────────────────────────────────
  updateSubscriptions: async (categoryIds) => {
    try {
      await preferencesApi.updatePreferences(categoryIds);
      const { data } = await preferencesApi.getPreferences();
      set({ preferences: data });
    } catch {}
  },

  setCountry: async (code) => {
    set({ selectedCountry: code });
    await AsyncStorage.setItem(COUNTRY_KEY, code);
    try {
      await preferencesApi.updateCountry(code);
    } catch {}
  },

  setDefaultCategory: async (slug) => {
    set({ defaultCategory: slug });
    await AsyncStorage.setItem(DEFAULT_CATEGORY_KEY, slug);
  },

  setTtsSpeed: async (speed) => {
    set({ ttsSpeed: speed });
    await AsyncStorage.setItem(TTS_SPEED_KEY, String(speed));
  },
}));
