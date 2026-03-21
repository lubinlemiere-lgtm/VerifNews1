// ###########################################################################
// # Store TextSize — Taille du texte (accessibilite)
// # 4 niveaux : small, normal, large, xlarge
// # Persiste dans AsyncStorage, applique un facteur d'echelle
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type TextSizeChoice = "small" | "normal" | "large" | "xlarge";

const SCALE_MAP: Record<TextSizeChoice, number> = {
  small: 0.85,
  normal: 1,
  large: 1.2,
  xlarge: 1.4,
};

interface TextSizeState {
  size: TextSizeChoice;
  scale: number;
  setSize: (size: TextSizeChoice) => void;
  loadSize: () => Promise<void>;
  getScaled: (baseSize: number) => number;
}

export const useTextSizeStore = create<TextSizeState>((set, get) => ({
  size: "normal",
  scale: 1,

  setSize: (size) => {
    const scale = SCALE_MAP[size];
    set({ size, scale });
    AsyncStorage.setItem("text_size", size);
  },

  loadSize: async () => {
    try {
      const saved = await AsyncStorage.getItem("text_size");
      if (saved && saved in SCALE_MAP) {
        const size = saved as TextSizeChoice;
        set({ size, scale: SCALE_MAP[size] });
      }
    } catch {
      // Ignore — garde la valeur par defaut
    }
  },

  getScaled: (baseSize: number) => {
    return Math.round(baseSize * get().scale);
  },
}));
