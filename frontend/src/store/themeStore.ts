// ###########################################################################
// # Store Theme — Mode sombre / clair
// # Persistance: AsyncStorage. Par defaut: dark
// # loadTheme() charge au demarrage, toggleTheme() bascule
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { DarkColors, LightColors } from "@/constants/colors";

export type ThemeMode = "dark" | "light";

export type ThemeColors = typeof DarkColors;

const darkColors: ThemeColors = DarkColors;
const lightColors: ThemeColors = LightColors;

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "dark",
  colors: darkColors,

  toggleTheme: () => {
    const newMode = get().mode === "dark" ? "light" : "dark";
    const newColors = newMode === "dark" ? darkColors : lightColors;
    set({ mode: newMode, colors: newColors });
    AsyncStorage.setItem("theme_mode", newMode);
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem("theme_mode");
      if (saved === "light" || saved === "dark") {
        set({
          mode: saved,
          colors: saved === "dark" ? darkColors : lightColors,
        });
      }
    } catch {
      // Keep default
    }
  },
}));
