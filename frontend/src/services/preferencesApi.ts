// ###########################################################################
// # Preferences API — Categories, abonnements, pays
// # getCategories(), getPreferences(), updatePreferences(), updateCountry()
// ###########################################################################

import api from "./api";
import type { Category, PreferenceItem } from "@/types/category";

export const preferencesApi = {
  getCategories: () => api.get<Category[]>("/categories"),

  getPreferences: () => api.get<PreferenceItem[]>("/preferences"),

  updatePreferences: (categoryIds: number[]) =>
    api.put("/preferences", { category_ids: categoryIds }),

  updateCountry: (countryCode: string) =>
    api.put("/preferences/country", { country_code: countryCode }),
};
