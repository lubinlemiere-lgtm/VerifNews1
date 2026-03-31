// ###########################################################################
// # ErrorRetry — Composant reutilisable pour afficher une erreur + retry
// # Style glass (dark, semi-transparent) aligné avec le design existant
// # Props: onRetry, message?, showOfflineOption?, onGoOffline?
// ###########################################################################

import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { useNetworkStore } from "@/store/networkStore";

interface ErrorRetryProps {
  onRetry: () => void;
  message?: string;
  showOfflineOption?: boolean;
  onGoOffline?: () => void;
}

export function ErrorRetry({
  onRetry,
  message,
  showOfflineOption = false,
  onGoOffline,
}: ErrorRetryProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const isConnected = useNetworkStore((s) => s.isConnected);

  const icon = isConnected ? "alert-circle-outline" : "cloud-offline-outline";
  const displayMessage =
    message ?? (isConnected ? t("error.message") : t("error.networkError"));

  const content = (
    <View style={styles.inner}>
      <Ionicons name={icon as any} size={48} color={colors.textMuted} />
      <Text style={[styles.title, { color: colors.text }]}>
        {t("error.title")}
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {displayMessage}
      </Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {t("error.tryAgain")}
      </Text>

      {/* Retry button */}
      <Pressable
        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        onPress={onRetry}
      >
        <Ionicons name="refresh-outline" size={18} color="#fff" />
        <Text style={styles.retryText}>{t("error.retry")}</Text>
      </Pressable>

      {/* Optional offline button */}
      {showOfflineOption && onGoOffline && (
        <Pressable
          style={[
            styles.offlineBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={onGoOffline}
        >
          <Ionicons
            name="download-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={[styles.offlineText, { color: colors.textSecondary }]}>
            {t("error.useOffline")}
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={30} tint="dark" style={styles.glass}>
          {content}
        </BlurView>
      ) : (
        <View
          style={[
            styles.glass,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {content}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  glass: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    width: "100%",
    maxWidth: 320,
  },
  inner: {
    alignItems: "center",
    padding: 28,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  offlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  offlineText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
