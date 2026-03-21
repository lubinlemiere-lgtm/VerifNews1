// ###########################################################################
// # Composant AudioPlayer — Barre audio compacte pour TTS d'article
// # Affiche play/pause, barre de progression, duree au format mm:ss
// # Couleurs dynamiques via useColors(), traductions via useTranslation()
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAudio } from "@/hooks/useAudio";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

interface AudioPlayerProps {
  articleId: string;
}

/** Formate des millisecondes en mm:ss */
function formatTime(ms: number): string {
  if (!ms || ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ articleId }: AudioPlayerProps) {
  const { play, pause, stop, isPlaying, isLoading, progress, duration } =
    useAudio(articleId);
  const colors = useColors();
  const { t } = useTranslation();

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const progressPercent = Math.min(Math.max(progress * 100, 0), 100);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceLight }]}
    >
      {/* Play / Pause button */}
      <Pressable
        onPress={handlePlayPause}
        disabled={isLoading}
        style={[styles.playButton, { backgroundColor: colors.primary }]}
        hitSlop={8}
        accessibilityLabel={
          isPlaying ? t("audio.pause") : t("audio.listen")
        }
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.background} />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={18}
            color={colors.background}
          />
        )}
      </Pressable>

      {/* Progress section */}
      <View style={styles.progressSection}>
        {/* Label */}
        <Text
          style={[styles.label, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {isLoading
            ? t("audio.loading")
            : isPlaying
              ? t("audio.playing")
              : t("audio.listen")}
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${progressPercent}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Duration */}
      <Text style={[styles.duration, { color: colors.textMuted }]}>
        {formatTime(duration)}
      </Text>

      {/* Stop button (visible only when playing or paused with progress) */}
      {(isPlaying || progress > 0) && (
        <Pressable
          onPress={stop}
          style={styles.stopButton}
          accessibilityLabel={t("audio.stop")}
          accessibilityRole="button"
        >
          <Ionicons name="stop" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 12,
    gap: 10,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    // Minimum touch target 44px via hitSlop
  },
  progressSection: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  duration: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    minWidth: 36,
    textAlign: "right",
  },
  stopButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
