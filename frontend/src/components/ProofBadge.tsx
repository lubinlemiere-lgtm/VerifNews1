// ###########################################################################
// # ProofBadge — Badge de verification (nombre de sources)
// # Vert clair = 1-2 sources, vert fonce = 3+ sources, gris = en attente
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";

interface ProofBadgeProps {
  verificationCount: number;
  isVerified: boolean;
}

export function ProofBadge({ verificationCount, isVerified }: ProofBadgeProps) {
  const { t } = useTranslation();
  const colors = useColors();
  if (!isVerified) {
    return (
      <View style={[styles.badge, styles.unverified]}>
        <Ionicons name="help-circle-outline" size={11} color={colors.textMuted} />
        <Text style={[styles.unverifiedText, { color: colors.textMuted }]}>{t("proof.pending")}</Text>
      </View>
    );
  }

  const isStrong = verificationCount >= 3;
  const color = isStrong ? colors.verifiedStrong : colors.verified;

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}15` }]}>
      <Ionicons name="shield-checkmark" size={12} color={color} />
      <Text style={[styles.text, { color }]}>
        {verificationCount} {verificationCount > 1 ? t("proof.sources") : t("proof.source")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  unverified: {
    borderColor: "transparent",
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
  },
  unverifiedText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
