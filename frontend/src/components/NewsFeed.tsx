// ###########################################################################
// # NewsFeed — FlatList avec pagination infinie et pull-to-refresh
// # Affiche les NewsCard, footer de chargement, etat vide
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import type { ArticleListItem } from "@/types/article";
import { AdBanner } from "./ui/AdBanner";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { SkeletonFeed } from "./ui/SkeletonCard";
import { NewsCard } from "./NewsCard";

interface NewsFeedProps {
  articles: ArticleListItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasNext: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  ListHeaderComponent?: React.ReactElement;
  onScroll?: any;
}

type FeedItem =
  | { type: "article"; data: ArticleListItem; isFirst: boolean }
  | { type: "ad" };

export function NewsFeed({
  articles,
  isLoading,
  isRefreshing,
  hasNext,
  onRefresh,
  onLoadMore,
  ListHeaderComponent,
  onScroll,
}: NewsFeedProps) {
  const { t } = useTranslation();
  const colors = useColors();
  // Insert ads every 8 articles, never in the first 3 — memoized
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    articles.forEach((article, index) => {
      items.push({ type: "article", data: article, isFirst: index === 0 });
      if (index >= 3 && (index + 1) % 8 === 0) {
        items.push({ type: "ad" });
      }
    });
    return items;
  }, [articles]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.type === "ad") {
      return <AdBanner />;
    }
    return <NewsCard article={item.data} isFeatured={item.isFirst} />;
  }, []);

  const keyExtractor = useCallback((item: FeedItem, index: number) => {
    if (item.type === "ad") return `ad-${index}`;
    return item.data.id;
  }, []);

  if (isLoading && articles.length === 0) {
    return (
      <Animated.ScrollView contentContainerStyle={styles.list}>
        {ListHeaderComponent}
        <SkeletonFeed />
      </Animated.ScrollView>
    );
  }

  return (
    <FlatList
      data={feedItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.list}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      onEndReached={hasNext ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      onScroll={onScroll}
      scrollEventThrottle={16}
      ListFooterComponent={
        hasNext ? (
          <View style={styles.loadingMore}>
            <LoadingSpinner />
          </View>
        ) : articles.length > 0 ? (
          <View style={styles.endOfFeed}>
            <View style={[styles.endLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.endText, { color: colors.textMuted }]}>{t("feed.caughtUp")}</Text>
            <View style={[styles.endLine, { backgroundColor: colors.border }]} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="newspaper-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("feed.empty")}</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            {t("feed.emptyDesc")}
          </Text>
          <View style={[styles.emptyHint, { backgroundColor: colors.surfaceLight }]}>
            <Ionicons name="arrow-down" size={16} color={colors.textMuted} />
            <Text style={[styles.emptyHintText, { color: colors.textMuted }]}>{t("feed.pullRefresh")}</Text>
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 90,
  },
  loadingMore: {
    paddingVertical: 20,
  },
  endOfFeed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 32,
    gap: 12,
  },
  endLine: {
    flex: 1,
    height: 1,
  },
  endText: {
    fontSize: 12,
    fontWeight: "500",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
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
    marginBottom: 24,
  },
  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  emptyHintText: {
    fontSize: 13,
  },
});
