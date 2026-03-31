// ###########################################################################
// # Hook Feed — Queries infinies (React Query / TanStack)
// # useFeed(): feed recent avec filtre categorie + pays prioritaire
// # useLatestFeed(): derniers articles publics
// # useTopFeed(): top articles par periode (week/month/year)
// ###########################################################################

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { feedApi } from "@/services/feedApi";
import { useNetworkStore } from "@/store/networkStore";
import {
  cacheArticles,
  getCachedArticles,
  getCacheTimestamp,
} from "@/services/offlineCache";
import type { ArticleListItem, PaginatedArticles } from "@/types/article";

// ── MOCK DATA — only available in dev mode ─────────────────────────────
// In production, if backend is down and no cache exists, show empty state.
const MOCK_ARTICLES: ArticleListItem[] = __DEV__
  ? [
      {
        id: "mock-1",
        title: "La NASA confirme la decouverte d'eau liquide sous la surface de Mars",
        summary: "Des echantillons du rover Perseverance revelent la presence d'un reservoir souterrain majeur pouvant contenir des traces de vie.",
        image_url: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&q=80",
        category_slug: "astronomy",
        published_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        is_verified: true,
        verification_count: 4,
        has_audio: true,
      },
      {
        id: "mock-2",
        title: "Un nouveau traitement revolutionnaire contre Alzheimer approuve par l'OMS",
        summary: "Les essais cliniques de phase 3 montrent une reduction de 60% du declin cognitif.",
        image_url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
        category_slug: "science_health",
        published_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        is_verified: true,
        verification_count: 3,
        has_audio: false,
      },
      {
        id: "mock-3",
        title: "Elections presidentielle 2027 : les premiers sondages revelent des surprises",
        summary: null,
        image_url: null,
        category_slug: "politics",
        published_at: new Date(Date.now() - 8 * 3600000).toISOString(),
        is_verified: true,
        verification_count: 5,
        has_audio: false,
      },
      {
        id: "mock-4",
        title: "Marvel annonce un reboot complet du MCU pour 2028",
        summary: "Kevin Feige devoile le plan pour la prochaine generation de heros.",
        image_url: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&q=80",
        category_slug: "cinema_series",
        published_at: new Date(Date.now() - 12 * 3600000).toISOString(),
        is_verified: true,
        verification_count: 2,
        has_audio: true,
      },
      {
        id: "mock-5",
        title: "Finale de la Ligue des Champions : PSG vs Manchester City — les compos revelees",
        summary: "Un choc au sommet prevu ce soir au Stade de France.",
        image_url: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80",
        category_slug: "sports",
        published_at: new Date(Date.now() - 1 * 3600000).toISOString(),
        is_verified: true,
        verification_count: 3,
        has_audio: false,
      },
      {
        id: "mock-6",
        title: "Worlds 2026 : T1 Faker prend sa retraite apres un dernier titre historique",
        summary: "Le GOAT de League of Legends quitte la scene sur une note parfaite.",
        image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
        category_slug: "esport",
        published_at: new Date(Date.now() - 24 * 3600000).toISOString(),
        is_verified: true,
        verification_count: 4,
        has_audio: false,
      },
    ]
  : [];

interface UseFeedOptions {
  category?: string;
  country?: string;
  countryPriority?: boolean;
}

export function useFeed(options: UseFeedOptions = {}) {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  const query = useInfiniteQuery({
    queryKey: ["feed", options.category, options.country, options.countryPriority],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const { data } = await feedApi.getFeed({
          page: pageParam,
          limit: 20,
          category: options.category,
          country: options.country,
          country_priority: options.countryPriority,
        });

        // Succes — sauvegarder en cache (premiere page uniquement)
        if (pageParam === 1) {
          cacheArticles(data.items).catch(() => {});
        }
        setIsFromCache(false);
        return data;
      } catch {
        // Si offline, essayer le cache local
        if (!isConnected && pageParam === 1) {
          const cached = await getCachedArticles();
          if (cached && cached.length > 0) {
            const ts = await getCacheTimestamp();
            setIsFromCache(true);
            setCacheTimestamp(ts);
            const filtered = options.category
              ? cached.filter((a) => a.category_slug === options.category)
              : cached;
            return {
              items: filtered,
              total: filtered.length,
              page: 1,
              page_size: 20,
              has_next: false,
            };
          }
        }

        // In dev: fallback to mock data; in prod: empty state
        if (__DEV__ && MOCK_ARTICLES.length > 0) {
          const filtered = options.category
            ? MOCK_ARTICLES.filter((a) => a.category_slug === options.category)
            : MOCK_ARTICLES;
          setIsFromCache(false);
          return {
            items: filtered,
            total: filtered.length,
            page: 1,
            page_size: 20,
            has_next: false,
          };
        }

        // Production: no backend + no cache → empty state with error
        setIsFromCache(false);
        throw new Error("Backend unavailable and no cached data");
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const articles: ArticleListItem[] =
    query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    articles,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching,
    hasNext: query.hasNextPage ?? false,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    isFromCache,
    cacheTimestamp,
  };
}

interface UseLatestFeedOptions {
  country?: string;
  countryPriority?: boolean;
}

export function useLatestFeed(options: UseLatestFeedOptions = {}) {
  const query = useInfiniteQuery({
    queryKey: ["feed", "latest", options.country, options.countryPriority],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await feedApi.getLatest({
        page: pageParam,
        limit: 20,
        country: options.country,
        country_priority: options.countryPriority,
      });
      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const articles: ArticleListItem[] =
    query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    articles,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching,
    hasNext: query.hasNextPage ?? false,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
  };
}

interface UseTopFeedOptions {
  period: "day" | "week" | "month" | "year";
  category?: string;
  enabled?: boolean;
  limit?: number;
}

export function useTopFeed(options: UseTopFeedOptions) {
  const pageLimit = options.limit ?? 15;
  const query = useInfiniteQuery({
    queryKey: ["feed", "top", options.period, options.category, pageLimit],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const { data } = await feedApi.getTop({
          period: options.period,
          category: options.category,
          page: pageParam,
          limit: pageLimit,
        });
        return data;
      } catch {
        // In dev: fallback to mock data sorted by popularity
        if (__DEV__ && MOCK_ARTICLES.length > 0) {
          const now = Date.now();
          const cutoffMap: Record<string, number> = {
            day: 1 * 24 * 3600000,
            week: 7 * 24 * 3600000,
            month: 30 * 24 * 3600000,
            year: 365 * 24 * 3600000,
          };
          const cutoff = cutoffMap[options.period] ?? 30 * 24 * 3600000;

          let filtered = MOCK_ARTICLES.filter((a) => {
            if (!a.published_at) return false;
            return now - new Date(a.published_at).getTime() < cutoff;
          });

          if (options.category) {
            filtered = filtered.filter(
              (a) => a.category_slug === options.category
            );
          }

          filtered.sort(
            (a, b) => b.verification_count - a.verification_count
          );

          return {
            items: filtered,
            total: filtered.length,
            page: 1,
            page_size: 15,
            has_next: false,
          };
        }

        // Production: no backend → empty state with error
        throw new Error("Backend unavailable");
      }
    },
    getNextPageParam: (lastPage) =>
      // Disable pagination when limit is small (top 10 mode)
      pageLimit <= 10 ? undefined : lastPage.has_next ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: options.enabled !== false,
  });

  const articles: ArticleListItem[] =
    query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    articles,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching,
    hasNext: query.hasNextPage ?? false,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
  };
}
