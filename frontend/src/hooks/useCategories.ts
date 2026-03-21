// ###########################################################################
// # Hook Categories — Wrapper du preferencesStore
// # Expose: categories, subscribedSlugs, loadCategories, loadPreferences
// ###########################################################################

import { usePreferencesStore } from "@/store/preferencesStore";

export function useCategories() {
  const {
    categories,
    preferences,
    selectedCountry,
    loadCategories,
    loadPreferences,
    updateSubscriptions,
    setCountry,
  } = usePreferencesStore();

  const subscribedSlugs = (preferences || [])
    .filter((p) => p.is_subscribed)
    .map((p) => p.category_slug);

  return {
    categories,
    preferences,
    subscribedSlugs,
    selectedCountry,
    loadCategories,
    loadPreferences,
    updateSubscriptions,
    setCountry,
  };
}
