// ###########################################################################
// # Store Langue — Detection auto + choix manuel FR/EN
// # Auto: detecte via expo-localization (langue du telephone)
// # Persistance: AsyncStorage. Choix: "auto" | "fr" | "en"
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { create } from "zustand";

import type { Language } from "@/i18n/translations";

type LanguageChoice = "auto" | "fr" | "en";

interface LanguageState {
  choice: LanguageChoice; // What the user picked
  language: Language; // The resolved language (fr or en)
  loadLanguage: () => Promise<void>;
  setLanguage: (choice: LanguageChoice) => Promise<void>;
}

function getDeviceLanguage(): Language {
  try {
    const locales = getLocales();
    const code = locales[0]?.languageCode ?? "en";
    return code === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

function resolveLanguage(choice: LanguageChoice): Language {
  if (choice === "auto") return getDeviceLanguage();
  return choice;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  choice: "auto",
  language: getDeviceLanguage(),

  loadLanguage: async () => {
    try {
      const stored = await AsyncStorage.getItem("language");
      if (stored === "fr" || stored === "en" || stored === "auto") {
        set({ choice: stored, language: resolveLanguage(stored) });
      }
    } catch {
      // Keep default
    }
  },

  setLanguage: async (choice: LanguageChoice) => {
    set({ choice, language: resolveLanguage(choice) });
    await AsyncStorage.setItem("language", choice);
  },
}));
