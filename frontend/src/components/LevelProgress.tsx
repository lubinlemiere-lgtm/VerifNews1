// ###########################################################################
// # LevelProgress — Composant de progression de niveau
// # Affiche: niveau actuel, barre de progression, points, streak
// # Utilise dans le ProfileDrawer pour les utilisateurs connectes
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { useGamificationStore } from "@/store/gamificationStore";

// Icone par niveau
const LEVEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  beginner: "leaf-outline",
  reader: "book-outline",
  expert: "school-outline",
  master: "medal-outline",
  legend: "diamond-outline",
};

export function LevelProgress() {
  const { t, language } = useTranslation();
  const colors = useColors();

  const totalPoints = useGamificationStore((s) => s.totalPoints);
  const streakDays = useGamificationStore((s) => s.streakDays);
  const getLevel = useGamificationStore((s) => s.getLevel);
  const getNextLevel = useGamificationStore((s) => s.getNextLevel);
  const getProgressToNextLevel = useGamificationStore((s) => s.getProgressToNextLevel);

  const level = getLevel();
  const nextLevel = getNextLevel();
  const progress = getProgressToNextLevel();

  // Animation de la barre de progression
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const levelLabel = language === "fr"
    ? level.labelFr
    : level.labelEn;
  const nextLevelLabel = nextLevel
    ? language === "fr" ? nextLevel.labelFr : nextLevel.labelEn
    : null;

  const levelIcon = LEVEL_ICONS[level.key] || "star-outline";

  const pointsTarget = nextLevel ? nextLevel.minPoints : totalPoints;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceLight }]}>
      {/* Ligne du haut: icone + niveau + points */}
      <View style={styles.topRow}>
        <View style={[styles.levelIconWrap, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name={levelIcon} size={20} color={colors.primary} />
        </View>
        <View style={styles.levelInfo}>
          <Text style={[styles.levelName, { color: colors.text }]}>
            {levelLabel}
          </Text>
          <Text style={[styles.pointsText, { color: colors.textSecondary }]}>
            {totalPoints} / {pointsTarget} {t("gamification.pts")}
          </Text>
        </View>
        {/* Streak */}
        {streakDays > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: colors.warning + "18" }]}>
            <Text style={styles.streakEmoji}>{"🔥"}</Text>
            <Text style={[styles.streakText, { color: colors.warning }]}>
              {streakDays} {streakDays > 1 ? t("gamification.streakDays") : t("gamification.streak")}
            </Text>
          </View>
        )}
      </View>

      {/* Barre de progression */}
      <View style={[styles.barBg, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: colors.primary,
              width: barWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* Prochain niveau */}
      <Text style={[styles.nextLevel, { color: colors.textMuted }]}>
        {nextLevel
          ? `${t("gamification.nextLevel")}: ${nextLevelLabel}`
          : t("gamification.maxLevel")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginVertical: 8,
    padding: 14,
    borderRadius: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  levelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 15,
    fontWeight: "700",
  },
  pointsText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 1,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "700",
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  nextLevel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 6,
  },
});
