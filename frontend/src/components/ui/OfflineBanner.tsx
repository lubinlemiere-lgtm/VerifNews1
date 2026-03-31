// ###########################################################################
// # OfflineBanner — Bandeau discret "Mode hors-ligne" en haut de l'ecran
// # Style glass (blur, semi-transparent, dark). Non intrusif.
// # N'apparait QUE si le reseau est coupe.
// ###########################################################################

import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetworkStore } from "@/store/networkStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useColors } from "@/hooks/useColors";
import { useThemeStore } from "@/store/themeStore";
import { withOpacity } from "@/utils/colors";

export function OfflineBanner() {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.mode) === "dark";

  if (isConnected) return null;

  const content = (
    <View style={styles.inner}>
      <Ionicons name="cloud-offline-outline" size={14} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>{t("network.offlineMode")}</Text>
    </View>
  );

  return (
    <View style={[styles.banner, { paddingTop: Platform.OS === "web" ? 4 : insets.top + 4 }]}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.blur}>
          {content}
        </BlurView>
      ) : (
        <View style={[styles.fallbackBg, { backgroundColor: withOpacity(colors.background, 0.92) }]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
  },
  blur: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  fallbackBg: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
