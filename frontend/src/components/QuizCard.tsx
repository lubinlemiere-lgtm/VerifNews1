// ###########################################################################
// # QuizCard — Carte de quiz (hebdo ou mensuel)
// # Design: gradient accent, icone categorie, badge type, timer winner
// ###########################################################################

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { CategoryColors } from "@/constants/colors";
import { CATEGORY_ICONS } from "@/constants/categories";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import type { QuizSummary } from "@/types/quiz";

interface QuizCardProps {
  quiz: QuizSummary;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();

  const isMonthly = quiz.quiz_type === "monthly";
  const icon = isMonthly
    ? "globe-outline"
    : CATEGORY_ICONS[quiz.category_slug ?? ""] || "help-circle-outline";
  const accentColor = isMonthly
    ? "#9B59B6"
    : CategoryColors[quiz.category_slug ?? ""] || colors.primary;

  const dayLabel = quiz.day_of_week === 0
    ? t("quiz.monday")
    : quiz.day_of_week === 3
      ? t("quiz.thursday")
      : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() => router.push(`/quiz/${quiz.quiz_id}`)}
      accessibilityRole="button"
    >
      {/* Top accent bar */}
      <LinearGradient
        colors={[accentColor, accentColor + "80"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: accentColor + "18" }]}>
            <Ionicons name={icon as any} size={22} color={accentColor} />
          </View>
          <View style={styles.info}>
            <View style={styles.typeRow}>
              {isMonthly ? (
                <View style={[styles.typeBadge, { backgroundColor: "#9B59B6" + "20" }]}>
                  <Ionicons name="star" size={10} color="#9B59B6" />
                  <Text style={[styles.typeText, { color: "#9B59B6" }]}>
                    {t("quiz.cultureG")}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.categoryName, { color: colors.textMuted }]}>
                  {quiz.category_name ?? ""}
                </Text>
              )}
              {dayLabel && (
                <Text style={[styles.dayLabel, { color: colors.textMuted }]}>
                  {dayLabel}
                </Text>
              )}
            </View>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {quiz.title}
            </Text>
            <Text style={[styles.questionsCount, { color: colors.textMuted }]}>
              {quiz.question_count} {t("quiz.questionsCount")}
            </Text>
          </View>

          {/* Play / Played badge */}
          {quiz.already_played ? (
            <View style={[styles.playedBadge, { backgroundColor: colors.success + "18" }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            </View>
          ) : (
            <View style={[styles.playBadge, { backgroundColor: accentColor }]}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          )}
        </View>

        {/* Winner row */}
        {quiz.winner && (
          <View style={[styles.winnerRow, { borderTopColor: colors.border }]}>
            <Ionicons name="trophy" size={13} color={colors.warning} />
            <Text style={[styles.winnerText, { color: colors.warning }]}>
              {quiz.winner.display_name} — {quiz.winner.score}/{quiz.winner.total}
            </Text>
            {quiz.winner.duration_seconds ? (
              <Text style={[styles.winnerTime, { color: colors.textMuted }]}>
                {formatDuration(quiz.winner.duration_seconds)}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    height: 3,
  },
  content: {
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  questionsCount: {
    fontSize: 11,
    marginTop: 2,
  },
  playBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  playedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  winnerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  winnerTime: {
    fontSize: 11,
    fontWeight: "500",
  },
});
