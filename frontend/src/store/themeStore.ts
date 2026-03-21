// ###########################################################################
// # Store Theme — Mode sombre / clair
// # Persistance: AsyncStorage. Par defaut: dark
// # loadTheme() charge au demarrage, toggleTheme() bascule
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type ThemeMode = "dark" | "light";

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  verified: string;
  verifiedStrong: string;
  background: string;
  surface: string;
  surfaceLight: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
}

const darkColors: ThemeColors = {
  primary: "#D0D4DC",       // Argent metallise clair
  secondary: "#8E95A4",     // Gris moyen metallise
  accent: "#E8ECF4",        // Blanc argente
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  verified: "#10B981",
  verifiedStrong: "#0EA5E9",
  background: "#030306",
  surface: "#111116",
  surfaceLight: "#1A1A22",
  card: "#15151D",
  text: "#F0F0F5",
  textSecondary: "#8E8EA0",
  textMuted: "#55556A",
  border: "#1F1F2C",
};

const lightColors: ThemeColors = {
  primary: "#3C4050",       // Charbon metallise
  secondary: "#6B7280",     // Gris acier
  accent: "#4B5264",        // Gris fonce
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  verified: "#059669",
  verifiedStrong: "#0369A1",
  background: "#F7F7F9",
  surface: "#FFFFFF",
  surfaceLight: "#EEEFF3",
  card: "#FFFFFF",
  text: "#1A1C24",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E2E4EA",
};

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
