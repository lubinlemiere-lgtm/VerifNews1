// ###########################################################################
// # Index — Redirection automatique vers les tabs (feed)
// # Pas de check auth: tout le monde accede au feed directement
// ###########################################################################

import { Redirect } from "expo-router";

// Toujours rediriger vers le feed principal (pas besoin de compte)
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
