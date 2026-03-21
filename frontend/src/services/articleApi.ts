// ###########################################################################
// # Article API — Detail article + recherche semantique
// # getDetail(id): article complet avec verifications
// # search(query): recherche par embedding cosinus
// ###########################################################################

import api from "./api";
import type { ArticleDetail, ArticleListItem } from "@/types/article";

export const articleApi = {
  getArticle: (id: string) => api.get<ArticleDetail>(`/articles/${id}`),

  getVerifications: (id: string) =>
    api.get(`/articles/${id}/verifications`),

  search: (query: string, limit = 20) =>
    api.get<ArticleListItem[]>("/articles/search/", {
      params: { q: query, limit },
    }),
};
