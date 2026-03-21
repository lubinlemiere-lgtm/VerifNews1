// ###########################################################################
// # Favoris — Articles sauvegardes localement (AsyncStorage)
// # Fonctionne sans compte. Liste les articles bookmarkes
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { useTranslation } from "@/hooks/useTranslation";
import { NewsCard } from "@/components/NewsCard";
import { TabBarOverlay } from "@/components/TabBarOverlay";

export default function BookmarksScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { bookmarks, loadBookmarks } = useBookmarkStore();

  useEffect(() => {
    loadBookmarks();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NewsCard article={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons
                name="bookmark-outline"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("bookmarks.empty")}</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              {t("bookmarks.hint")}
            </Text>
          </View>
        }
      />

      {/* Frosted glass tab bar overlay */}
      <TabBarOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingBottom: 90,
    paddingTop: 8,
  },
  empty: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },
});
