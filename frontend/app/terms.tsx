// ###########################################################################
// # Conditions Generales d'Utilisation — Ecran dedie scrollable
// # Requis par les stores (Google Play / App Store)
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

function Paragraph({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{text}</Text>;
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

export default function TermsScreen() {
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
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
          hitSlop={16}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("terms.title")}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Section title={t("terms.objectTitle")}>
          <Paragraph text={t("terms.objectText")} />
        </Section>

        <Section title={t("terms.accessTitle")}>
          <Paragraph text={t("terms.accessText")} />
        </Section>

        <Section title={t("terms.contentTitle")}>
          <Bullet text={t("terms.contentBullet1")} />
          <Bullet text={t("terms.contentBullet2")} />
          <Bullet text={t("terms.contentBullet3")} />
        </Section>

        <Section title={t("terms.ipTitle")}>
          <Paragraph text={t("terms.ipText")} />
        </Section>

        <Section title={t("terms.responsibilityTitle")}>
          <Bullet text={t("terms.responsibilityBullet1")} />
          <Bullet text={t("terms.responsibilityBullet2")} />
        </Section>

        <Section title={t("terms.dataTitle")}>
          <Paragraph text={t("terms.dataText")} />
        </Section>

        <Section title={t("terms.changesTitle")}>
          <Paragraph text={t("terms.changesText")} />
        </Section>

        <Section title={t("terms.contactTitle")}>
          <Paragraph text={`${t("terms.contactText")} ${SUPPORT_EMAIL}`} />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
});
