// ###########################################################################
// # Haptics — Retour haptique leger
// # Utilise expo-haptics sur mobile, no-op sur web
// ###########################################################################

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export function lightHaptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export function mediumHaptic() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

export function selectionHaptic() {
  if (Platform.OS !== "web") {
    Haptics.selectionAsync().catch(() => {});
  }
}
