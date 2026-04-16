// ###########################################################################
// # Recherche — Recherche semantique d'articles
// # Barre de recherche + suggestions + resultats par embedding cosinus
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";

import { useColors } from "@/hooks/useColors";
import { useSearch } from "@/hooks/useSearch";
import { useTranslation } from "@/hooks/useTranslation";
import { NewsCard } from "@/components/NewsCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SearchScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [query, setQuery] = useState("");
  const { results, isLoading, debouncedTerm, search, clear, hasSearched } =
    useSearch();

  const handleChangeText = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleClear = () => {
    setQuery("");
    clear();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchBar}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons
            name="search"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t("search.placeholder")}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleChangeText}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlashList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NewsCard article={item} />}
          estimatedItemSize={216}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            hasSearched && results.length > 0 ? (
              <Text style={[styles.resultCount, { color: colors.textMuted }]}>
                {results.length} {results.length !== 1 ? t("search.resultsCount") : t("search.resultCount")} {t("search.for")} "
                {debouncedTerm}"
              </Text>
            ) : null
          }
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons
                    name="search-outline"
                    size={40}
                    color={colors.textMuted}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("search.noResults")}</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  {t("search.tryDifferent")}
                </Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons
                    name="sparkles-outline"
                    size={40}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("search.semanticTitle")}</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  {t("search.semanticDesc")}
                </Text>
                <View style={styles.suggestions}>
                  <Text style={[styles.suggestionsLabel, { color: colors.textMuted }]}>{t("search.trySuggestions")}</Text>
                  {[t("search.suggestion1"), t("search.suggestion2"), t("search.suggestion3")].map(
                    (suggestion) => (
                      <Pressable
                        key={suggestion}
                        style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => {
                          setQuery(suggestion);
                          search(suggestion);
                        }}
                      >
                        <Text style={[styles.suggestionText, { color: colors.primary }]}>{suggestion}</Text>
                      </Pressable>
                    )
                  )}
                </View>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  list: {
    paddingBottom: 20,
  },
  resultCount: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  suggestions: {
    alignItems: "center",
    gap: 8,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  suggestionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
