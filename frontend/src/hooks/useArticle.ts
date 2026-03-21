// ###########################################################################
// # Hook Article — Chargement detail d'un article par ID
// # Utilise React Query avec cache de 5min
// ###########################################################################

import { useQuery } from "@tanstack/react-query";

import { articleApi } from "@/services/articleApi";

export function useArticle(id: string) {
  const query = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      const { data } = await articleApi.getArticle(id);
      return data;
    },
    enabled: !!id,
  });

  return {
    article: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
