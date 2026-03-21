// ###########################################################################
// # Hook Feed — Queries infinies (React Query / TanStack)
// # useFeed(): feed recent avec filtre categorie + pays prioritaire
// # useLatestFeed(): derniers articles publics
// # useTopFeed(): top articles par periode (week/month/year)
// ###########################################################################

import { useInfiniteQuery } from "@tanstack/react-query";

import { feedApi } from "@/services/feedApi";
import type { ArticleListItem, PaginatedArticles } from "@/types/article";

// ── MOCK DATA — fallback quand le backend n'est pas en ligne ────────────
// TODO: supprimer ce bloc quand le backend est deploye
const MOCK_ARTICLES: ArticleListItem[] = [
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
    likes: 1243,
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
    likes: 876,
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
    likes: 2105,
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
    likes: 534,
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
    likes: 1890,
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
    likes: 1567,
  },
];

const MOCK_RESPONSE: PaginatedArticles = {
  items: MOCK_ARTICLES,
  total: MOCK_ARTICLES.length,
  page: 1,
  page_size: 20,
  has_next: false,
};

interface UseFeedOptions {
  category?: string;
  country?: string;
  countryPriority?: boolean;
}

export function useFeed(options: UseFeedOptions = {}) {
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
        return data;
      } catch {
        // Fallback mock quand le backend est hors ligne
        const filtered = options.category
          ? MOCK_ARTICLES.filter((a) => a.category_slug === options.category)
          : MOCK_ARTICLES;
        return {
          items: filtered,
          total: filtered.length,
          page: 1,
          page_size: 20,
          has_next: false,
        };
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
  period: "week" | "month" | "year";
  category?: string;
  enabled?: boolean;
}

export function useTopFeed(options: UseTopFeedOptions) {
  const query = useInfiniteQuery({
    queryKey: ["feed", "top", options.period, options.category],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const { data } = await feedApi.getTop({
          period: options.period,
          category: options.category,
          page: pageParam,
          limit: 15,
        });
        return data;
      } catch {
        // Fallback mock — tri par popularite (likes + sources)
        const now = Date.now();
        const cutoff =
          options.period === "year" ? 365 * 24 * 3600000 : 30 * 24 * 3600000;

        let filtered = MOCK_ARTICLES.filter((a) => {
          if (!a.published_at) return false;
          return now - new Date(a.published_at).getTime() < cutoff;
        });

        if (options.category) {
          filtered = filtered.filter(
            (a) => a.category_slug === options.category
          );
        }

        // Score = likes + (verification_count * 100) pour valoriser importance
        filtered.sort(
          (a, b) =>
            b.likes + b.verification_count * 100 -
            (a.likes + a.verification_count * 100)
        );

        return {
          items: filtered,
          total: filtered.length,
          page: 1,
          page_size: 15,
          has_next: false,
        };
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
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
