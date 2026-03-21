// ###########################################################################
// # Politique de confidentialite — Ecran dedie scrollable
// # Requis par le RGPD et les stores (Google Play / App Store)
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { SUPPORT_EMAIL } from "@/constants/config";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
      <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === "web" ? 16 : insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          hitSlop={16}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("privacy.title")}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: colors.primary + "12" }]}>
          <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          <Text style={[styles.introText, { color: colors.text }]}>
            {t("privacy.intro")}
          </Text>
        </View>

        <Text style={[styles.lastUpdated, { color: colors.textMuted }]}>
          {t("privacy.lastUpdated")}
        </Text>

        {/* Sections */}
        <Section title={t("privacy.dataCollectedTitle")}>
          <Bullet text={t("privacy.dataEmail")} />
          <Bullet text={t("privacy.dataPrefs")} />
          <Bullet text={t("privacy.dataUsage")} />
        </Section>

        <Section title={t("privacy.dataUsageTitle")}>
          <Bullet text={t("privacy.usageAuth")} />
          <Bullet text={t("privacy.usagePersonalize")} />
          <Bullet text={t("privacy.usageImprove")} />
        </Section>

        <Section title={t("privacy.noSharingTitle")}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {t("privacy.noSharingBody")}
          </Text>
        </Section>

        <Section title={t("privacy.localStorageTitle")}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {t("privacy.localStorageBody")}
          </Text>
        </Section>

        <Section title={t("privacy.rightsTitle")}>
          <Bullet text={t("privacy.rightAccess")} />
          <Bullet text={t("privacy.rightDelete")} />
          <Bullet text={t("privacy.rightExport")} />
          <Bullet text={t("privacy.rightWithdraw")} />
        </Section>

        <Section title={t("privacy.contactTitle")}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            {t("privacy.contactBody")}
          </Text>
          <Text style={[styles.contactEmail, { color: colors.primary }]}>
            {SUPPORT_EMAIL}
          </Text>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  introText: { fontSize: 15, fontWeight: "600", flex: 1, lineHeight: 21 },
  lastUpdated: { fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  bodyText: { fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  contactEmail: { fontSize: 15, fontWeight: "600", marginTop: 6 },
});
