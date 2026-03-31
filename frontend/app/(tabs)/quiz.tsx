// ###########################################################################
// # Quiz Tab — 2 quiz/semaine + culture G mensuel
// # Sections: Stats header, This Week, Monthly, Badges
// ###########################################################################

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { quizApi } from "@/services/quizApi";
import type { QuizSummary } from "@/types/quiz";
import { QuizCard } from "@/components/QuizCard";
import { TabBarOverlay } from "@/components/TabBarOverlay";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { useQuizHistoryStore } from "@/store/quizHistoryStore";

// ── Composant principal ─────────────────────────────────────────────
export default function QuizTabScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const history = useQuizHistoryStore((s) => s.history);
  const getStatsFn = useQuizHistoryStore((s) => s.getStats);
  const getBadgesFn = useQuizHistoryStore((s) => s.getBadges);
  const stats = useMemo(() => getStatsFn(), [history]);
  const badges = useMemo(() => getBadgesFn(), [history]);

  // ── Chargement des quiz depuis l'API ────────────────────────────
  const loadQuizzes = useCallback(async () => {
    try {
      setError(false);
      const { data } = await quizApi.list();
      setQuizzes(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadQuizzes();
  };

  // ── Separation hebdo / mensuel ──────────────────────────────────
  const weeklyQuizzes = quizzes.filter((q) => q.quiz_type === "weekly");
  const monthlyQuiz = quizzes.find((q) => q.quiz_type === "monthly");

  // ── Configuration des badges ────────────────────────────────────
  const badgeIcons: Record<string, { icon: string; color: string }> = {
    streak5: { icon: "flame", color: "#E67E22" },
    streak10: { icon: "flame", color: "#E74C3C" },
    expert: { icon: "school", color: "#3498DB" },
    perfect: { icon: "diamond", color: "#9B59B6" },
    monthlyChamp: { icon: "trophy", color: "#F1C40F" },
  };

  // ── Header de la FlatList (stats, badges, quiz mensuel) ────────
  const headerComponent = (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Ionicons name="game-controller" size={22} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("quiz.weeklyTitle")}
          </Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {t("quiz.weeklySubtitle")}
        </Text>
      </View>

      {/* Stats row */}
      {stats.totalPlayed > 0 && (
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalPlayed}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t("quiz.statsPlayed")}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.averageScore}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t("quiz.statsAverage")}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.streakWeeks}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t("quiz.statsStreak")}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#9B59B6" }]}>{stats.bestScore}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {t("quiz.statsBest")}
            </Text>
          </View>
        </View>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <View style={styles.badgesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("quiz.badges")}
          </Text>
          <View style={styles.badgesRow}>
            {badges.map((badge, i) => {
              const cfg = badgeIcons[badge.type] || { icon: "ribbon", color: colors.primary };
              return (
                <View
                  key={`${badge.type}-${badge.category ?? ""}-${i}`}
                  style={[styles.badgeItem, { backgroundColor: cfg.color + "15" }]}
                >
                  <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                  <Text style={[styles.badgeLabel, { color: cfg.color }]} numberOfLines={1}>
                    {t(badge.label)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Monthly quiz (special card) */}
      {monthlyQuiz && (
        <View style={styles.monthlySection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={16} color="#9B59B6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("quiz.monthlyQuiz")}
            </Text>
          </View>
          <QuizCard quiz={monthlyQuiz} />
        </View>
      )}

      {/* Section title for weekly */}
      {weeklyQuizzes.length > 0 && (
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("quiz.thisWeek")}
          </Text>
        </View>
      )}
    </View>
  );

  // ── Etat vide / erreur ──────────────────────────────────────────
  const emptyComponent = loading ? (
    <LoadingSpinner />
  ) : error ? (
    <ErrorRetry onRetry={loadQuizzes} />
  ) : (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="game-controller-outline"
        size={56}
        color={colors.textMuted}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t("quiz.emptyTitle")}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {t("quiz.emptySubtitle")}
      </Text>
    </View>
  );

  // ── Rendu principal ─────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={weeklyQuizzes}
        keyExtractor={(item) => String(item.quiz_id)}

        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <QuizCard quiz={item} />
          </View>
        )}
        ListEmptyComponent={quizzes.length === 0 ? emptyComponent : null}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={[
          styles.list,
          quizzes.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <TabBarOverlay />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  listEmpty: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  // Badges
  badgesSection: {
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 120,
  },
  // Sections
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  monthlySection: {
    marginBottom: 20,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
