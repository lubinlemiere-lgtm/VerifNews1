// ###########################################################################
// # Couleurs — Palette principale (dark mode par defaut)
// # Colors: couleurs globales. CategoryColors: couleur par categorie
// # LightColors: palette mode clair (utilisee si theme = light)
// ###########################################################################

export const Colors = {
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

export const CategoryColors: Record<string, string> = {
  astronomy: "#7B2FBE",
  science_health: "#06D6A0",
  cinema_series: "#EF476F",
  sports: "#FFD166",
  esport: "#F77F00",
  politics: "#8B95A8",
};
