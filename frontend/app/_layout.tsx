// ###########################################################################
// # Layout Principal — Point d'entree de l'app
// # Flow de demarrage:
// #   1. Guest (pas de compte) → accueil IMMEDIAT, zero attente
// #   2. Connecte → accueil + WelcomeSplash overlay "Bonjour {nom}" → fondu
// #   Auth se valide en arriere-plan, JAMAIS de loading bloquant
// ###########################################################################

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";

SplashScreen.preventAutoHideAsync();

import { useAuthStore } from "@/store/authStore";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { useReactionStore } from "@/store/reactionStore";
import { useThemeStore } from "@/store/themeStore";
import { useLanguageStore } from "@/store/languageStore";
import { usePreferencesStore } from "@/store/preferencesStore";
import { useTextSizeStore } from "@/store/textSizeStore";
import { useQuizHistoryStore } from "@/store/quizHistoryStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { useNotifications } from "@/hooks/useNotifications";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function RootLayoutInner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);
  const loadBookmarks = useBookmarkStore((s) => s.loadBookmarks);
  const loadReactions = useReactionStore((s) => s.loadReactions);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const themeMode = useThemeStore((s) => s.mode);
  const loadLanguage = useLanguageStore((s) => s.loadLanguage);
  const loadCountry = usePreferencesStore((s) => s.loadCountry);
  const loadDefaultCategory = usePreferencesStore((s) => s.loadDefaultCategory);
  const loadTtsSpeed = usePreferencesStore((s) => s.loadTtsSpeed);
  const loadTtsEnabled = usePreferencesStore((s) => s.loadTtsEnabled);
  const loadTextSize = useTextSizeStore((s) => s.loadSize);
  const loadQuizHistory = useQuizHistoryStore((s) => s.loadHistory);
  const loadNotifPrefs = useNotificationStore((s) => s.loadPrefs);
  const loadGamification = useGamificationStore((s) => s.loadData);
  const checkStreak = useGamificationStore((s) => s.checkStreak);
  const [showWelcome, setShowWelcome] = useState(false);

  // Initialiser les notifications push
  useNotifications();

  useEffect(() => {
    // Charger tous les stores puis cacher le splash screen natif
    Promise.all([
      loadUser(),
      loadBookmarks(),
      loadReactions(),
      loadTheme(),
      loadLanguage(),
      loadCountry(),
      loadDefaultCategory(),
      loadTtsSpeed(),
      loadTtsEnabled(),
      loadTextSize(),
      loadQuizHistory(),
      loadNotifPrefs(),
      loadGamification().then(() => checkStreak()),
    ]).finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  // Quand l'utilisateur est connecte ET qu'on a ses infos → WelcomeSplash
  useEffect(() => {
    if (isAuthenticated && user) {
      setShowWelcome(true);
    }
  }, [isAuthenticated, user]);

  // Rendu IMMEDIAT — jamais de LoadingSpinner au demarrage
  return (
    <ErrorBoundary>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="article/[id]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="privacy"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="terms"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="category-onboard"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="(auth)"
          options={{ presentation: "modal" }}
        />
      </Stack>
      {showWelcome && (
        <WelcomeSplash
          displayName={user?.display_name ?? null}
          onDone={() => setShowWelcome(false)}
        />
      )}
      <OfflineBanner />
    </ErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}
