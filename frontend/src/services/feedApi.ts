// ###########################################################################
// # Feed API — Endpoints flux d'articles
// # getFeed(): feed personnalise (auth) avec country_priority
// # getLatest(): derniers articles publics avec country_priority
// # getTop(): top articles par periode
// ###########################################################################

import api from "./api";
import type { PaginatedArticles } from "@/types/article";

interface FeedParams {
  page?: number;
  limit?: number;
  category?: string;
  country?: string;
  verified_only?: boolean;
  country_priority?: boolean;
}

interface LatestFeedParams {
  page?: number;
  limit?: number;
  category?: string;
  country?: string;
  country_priority?: boolean;
}

interface TopFeedParams {
  period?: "week" | "month" | "year";
  category?: string;
  page?: number;
  limit?: number;
}

export const feedApi = {
  getFeed: (params: FeedParams = {}) =>
    api.get<PaginatedArticles>("/feed", { params }),

  getLatest: (params: LatestFeedParams = {}) =>
    api.get<PaginatedArticles>("/feed/latest", { params }),

  getTop: (params: TopFeedParams = {}) =>
    api.get<PaginatedArticles>("/feed/top", { params }),
};
