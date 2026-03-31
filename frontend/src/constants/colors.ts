// ###########################################################################
// # Couleurs — Palettes dark et light
// # DarkColors: palette sombre (glass morphism, fond noir)
// # LightColors: palette claire (fond blanc/gris clair, clean & modern)
// # Colors: alias vers DarkColors (retrocompatibilite)
// # CategoryColors: couleurs par categorie (identiques en dark et light)
// ###########################################################################

export const DarkColors = {
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

export const LightColors = {
  primary: "#3C4050",       // Charbon metallise
  secondary: "#6B7280",     // Gris acier
  accent: "#4B5264",        // Gris fonce
  success: "#059669",       // Vert ajuste pour fond clair
  warning: "#D97706",       // Ambre ajuste pour fond clair
  danger: "#DC2626",        // Rouge ajuste pour fond clair
  verified: "#059669",
  verifiedStrong: "#0369A1",

  background: "#F8F9FA",    // Gris tres clair (Apple-style)
  surface: "#FFFFFF",       // Blanc pur
  surfaceLight: "#F1F2F6",  // Gris pale pour sous-elements
  card: "#FFFFFF",          // Cartes blanches

  text: "#1A1A2E",          // Noir profond pour lisibilite
  textSecondary: "#6B7280", // Gris moyen
  textMuted: "#9CA3AF",     // Gris clair

  border: "#E5E7EB",        // Bordure gris clair subtile
};

// Alias retrocompatible — les imports de `Colors` continuent de fonctionner
export const Colors = DarkColors;

export const CategoryColors: Record<string, string> = {
  astronomy: "#7B2FBE",
  science_health: "#06D6A0",
  cinema_series: "#EF476F",
  sports: "#FFD166",
  esport: "#F77F00",
  politics: "#8B95A8",
};
