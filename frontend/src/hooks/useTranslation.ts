// ###########################################################################
// # Hook i18n — Fonction t() pour traductions FR/EN
// # Utilise le languageStore pour la langue active
// # t("cle") retourne la traduction, t("cle", {n: 5}) avec parametres
// ###########################################################################

import { translations } from "@/i18n/translations";
import { useLanguageStore } from "@/store/languageStore";

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  const dict = translations[language];

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = dict[key] ?? translations.en[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return { t, language };
}
