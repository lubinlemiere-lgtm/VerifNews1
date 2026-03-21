// ###########################################################################
// # Hook Search — Recherche semantique d'articles
// # Debounce 400ms: la recherche se lance automatiquement en tapant
// # Envoie la query a l'API /articles/search, retourne resultats
// ###########################################################################

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import { articleApi } from "@/services/articleApi";
import type { ArticleListItem } from "@/types/article";
import { useDebounce } from "@/hooks/useDebounce";

export function useSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedTerm = useDebounce(searchTerm, 400);

  const { data, isLoading, error } = useQuery({
    queryKey: ["search", debouncedTerm],
    queryFn: async () => {
      if (debouncedTerm.length < 3) return [];
      const { data } = await articleApi.search(debouncedTerm);
      return data;
    },
    enabled: debouncedTerm.length >= 3,
    staleTime: 30000,
  });

  const search = useCallback((term: string) => {
    setSearchTerm(term.trim());
  }, []);

  const clear = useCallback(() => {
    setSearchTerm("");
  }, []);

  return {
    results: (data || []) as ArticleListItem[],
    isLoading,
    error,
    searchTerm,
    debouncedTerm,
    search,
    clear,
    hasSearched: debouncedTerm.length >= 3,
  };
}
