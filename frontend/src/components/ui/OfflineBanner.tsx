// ###########################################################################
// # OfflineBanner — Petit bandeau discret quand le reseau est coupe
// # N'apparait QUE si le navigateur est vraiment offline (navigator.onLine)
// # Ne bloque JAMAIS l'UI — juste un bandeau en haut
// ###########################################################################

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useNetworkStore } from "@/store/networkStore";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

export function OfflineBanner() {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const colors = useColors();
  const { t } = useTranslation();

  if (isConnected) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.danger ?? "#E74C3C" }]}>
      <Text style={styles.text}>{t("network.offline")}</Text>
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
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
