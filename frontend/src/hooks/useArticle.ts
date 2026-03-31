// ###########################################################################
// # Hook Article — Chargement detail d'un article par ID
// # Utilise React Query avec cache de 5min
// # Fallback cache offline si pas de connexion
// ###########################################################################

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { articleApi } from "@/services/articleApi";
import { useNetworkStore } from "@/store/networkStore";
import {
  cacheArticleDetail,
  getCachedArticleDetail,
} from "@/services/offlineCache";

export function useArticle(id: string) {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const [isFromCache, setIsFromCache] = useState(false);

  const query = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      try {
        const { data } = await articleApi.getArticle(id);

        // Succes — sauvegarder en cache
        cacheArticleDetail(id, data).catch(() => {});
        setIsFromCache(false);
        return data;
      } catch (err) {
        // Si offline, essayer le cache local
        if (!isConnected) {
          const cached = await getCachedArticleDetail(id);
          if (cached) {
            setIsFromCache(true);
            return cached;
          }
        }
        // Re-throw pour que React Query gere l'erreur
        throw err;
      }
    },
    enabled: !!id,
  });

  return {
    article: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFromCache,
  };
}
