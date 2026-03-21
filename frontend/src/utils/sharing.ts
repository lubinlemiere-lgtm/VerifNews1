// ###########################################################################
// # Sharing utilities — Deep links + partage natif
// # Génère des liens universels pour partager des articles
// # Scheme: verifnews://article/{id}
// # Web fallback: https://verifnews.app/article/{id}
// ###########################################################################

import { Share, Platform } from "react-native";
import * as Linking from "expo-linking";
import { useGamificationStore } from "@/store/gamificationStore";

const APP_SCHEME = "verifnews";
const WEB_BASE = "https://verifnews.app";

/**
 * Génère un deep link vers un article
 * Mobile: verifnews://article/{id}
 * Web fallback: https://verifnews.app/article/{id}
 */
export function getArticleDeepLink(articleId: string): string {
  return Linking.createURL(`article/${articleId}`);
}

/**
 * Génère l'URL web publique d'un article (pour partage externe)
 */
export function getArticleWebUrl(articleId: string): string {
  return `${WEB_BASE}/article/${articleId}`;
}

/**
 * Partage un article via le système de partage natif
 * Inclut le deep link + URL originale de la source
 */
export async function shareArticle(params: {
  articleId: string;
  title: string;
  summary?: string;
  originalUrl?: string;
  sharedViaText: string;
}): Promise<boolean> {
  const { articleId, title, summary, originalUrl, sharedViaText } = params;

  // Deep link vers l'app
  const appLink = getArticleWebUrl(articleId);

  // Construire le message
  let message = `📰 ${title}`;
  if (summary) {
    // Limite le résumé à ~100 caractères pour les réseaux sociaux
    const shortSummary =
      summary.length > 100 ? summary.substring(0, 97) + "..." : summary;
    message += `\n\n${shortSummary}`;
  }
  message += `\n\n🔗 ${appLink}`;
  if (originalUrl) {
    message += `\n📎 ${originalUrl}`;
  }
  message += `\n\n✅ ${sharedViaText}`;

  try {
    const result = await Share.share(
      Platform.OS === "ios"
        ? { message, url: appLink }
        : { title, message },
    );
    const shared = result.action === Share.sharedAction;
    if (shared) {
      useGamificationStore.getState().addPoints("share");
    }
    return shared;
  } catch {
    return false;
  }
}
