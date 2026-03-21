// ###########################################################################
// # SourceList — Liste des sources de verification d'un article
// # Affiche nom, URL et score de similarite pour chaque source
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import type { VerificationInfo } from "@/types/article";

interface SourceListProps {
  verifications: VerificationInfo[];
}

export function SourceList({ verifications }: SourceListProps) {
  const { t } = useTranslation();
  const colors = useColors();
  if (verifications.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceLight }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t("sources.verifiedBy")}</Text>
      {verifications.map((v, i) => (
        <View key={i} style={styles.item}>
          <Ionicons name="checkmark-circle" size={16} color={colors.verified} />
          <View style={styles.itemText}>
            <Text style={[styles.sourceName, { color: colors.text }]}>{v.source_name}</Text>
            {v.matched_title && (
              <Text style={[styles.matchedTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {v.matched_title}
              </Text>
            )}
            {v.similarity_score && (
              <Text style={[styles.score, { color: colors.verified }]}>
                {`${Math.round(v.similarity_score * 100)}% ${t("sources.match")}`}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 14,
    marginTop: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  itemText: {
    flex: 1,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: "600",
  },
  matchedTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  score: {
    fontSize: 11,
    marginTop: 2,
  },
});
