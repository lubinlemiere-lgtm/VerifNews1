// ###########################################################################
// # Offline Cache — Stockage local des articles via AsyncStorage
// # Permet de lire les articles meme sans connexion internet
// # Garde max 50 articles en cache + leurs details individuels
// ###########################################################################

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ArticleListItem, ArticleDetail } from "@/types/article";

// ── Cache keys ─────────────────────────────────────────────────────────
const FEED_CACHE_KEY = "@verifnews_feed_cache";
const ARTICLE_PREFIX = "@verifnews_article_";
const TIMESTAMP_KEY = "@verifnews_cache_timestamp";

const MAX_CACHED_ARTICLES = 50;

// ── Feed cache ─────────────────────────────────────────────────────────

/**
 * Sauvegarde les articles du feed dans le cache local.
 * Garde les MAX_CACHED_ARTICLES plus recents.
 */
export async function cacheArticles(articles: ArticleListItem[]): Promise<void> {
  try {
    const trimmed = articles.slice(0, MAX_CACHED_ARTICLES);
    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(trimmed));
    await AsyncStorage.setItem(TIMESTAMP_KEY, new Date().toISOString());
  } catch {
    // Silently fail — cache is best-effort
  }
}

/**
 * Recupere les articles du feed depuis le cache local.
 * Retourne null si aucun cache n'existe.
 */
export async function getCachedArticles(): Promise<ArticleListItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ArticleListItem[];
  } catch {
    return null;
  }
}

// ── Article detail cache ───────────────────────────────────────────────

/**
 * Sauvegarde le detail d'un article dans le cache local.
 */
export async function cacheArticleDetail(
  id: string,
  article: ArticleDetail
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      ARTICLE_PREFIX + id,
      JSON.stringify(article)
    );
  } catch {
    // Silently fail
  }
}

/**
 * Recupere le detail d'un article depuis le cache local.
 * Retourne null si pas en cache.
 */
export async function getCachedArticleDetail(
  id: string
): Promise<ArticleDetail | null> {
  try {
    const raw = await AsyncStorage.getItem(ARTICLE_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as ArticleDetail;
  } catch {
    return null;
  }
}

// ── Utilities ──────────────────────────────────────────────────────────

/**
 * Retourne le timestamp ISO de la derniere mise en cache, ou null.
 */
export async function getCacheTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

/**
 * Supprime tout le cache offline.
 */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(
      (k) =>
        k === FEED_CACHE_KEY ||
        k === TIMESTAMP_KEY ||
        k.startsWith(ARTICLE_PREFIX)
    );
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Silently fail
  }
}
