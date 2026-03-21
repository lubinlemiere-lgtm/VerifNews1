// ###########################################################################
// # Hook useColors — Couleurs reactives selon le theme (dark/light)
// # Retourne les couleurs du theme actif via themeStore
// # Usage: const colors = useColors();  puis style={{ color: colors.text }}
// ###########################################################################

import { useThemeStore } from "@/store/themeStore";

/**
 * Returns the current theme colors (dark or light).
 * Components using this hook will re-render when the theme changes.
 */
export function useColors() {
  return useThemeStore((s) => s.colors);
}
