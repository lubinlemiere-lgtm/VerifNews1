// ###########################################################################
// # Notification Settings — Paramètres des notifications
// # Toggles: breaking news, daily digest, quiz rappels, catégories
// # + lien vers les paramètres système si permission refusée
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { useNotificationStore } from "@/store/notificationStore";
import {
  getNotificationPermissionStatus,
  registerForPushNotifications,
} from "@/services/notificationService";

// ── Toggle Row ──────────────────────────────────────────────────────────
function ToggleRow({
  icon,
  label,
  description,
  value,
  onToggle,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    breakingNews,
    dailyDigest,
    quizReminders,
    categoryAlerts,
    loaded,
    loadPrefs,
    togglePref,
  } = useNotificationStore();

  const [permissionStatus, setPermissionStatus] = useState<string>("undetermined");

  useEffect(() => {
    loadPrefs();
    getNotificationPermissionStatus().then(setPermissionStatus);
  }, []);

  const permissionDenied = permissionStatus === "denied";
  const permissionGranted = permissionStatus === "granted";

  const handleEnableNotifications = async () => {
    if (permissionDenied) {
      // Ouvrir les paramètres système
      if (Platform.OS === "ios") {
        Linking.openURL("app-settings:");
      } else {
        Linking.openSettings();
      }
    } else {
      const token = await registerForPushNotifications();
      if (token) {
        setPermissionStatus("granted");
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t("country.close")}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("profile.notifications")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Bannière permission */}
        {!permissionGranted && (
          <Pressable
            style={[
              styles.permissionBanner,
              { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" },
            ]}
            onPress={handleEnableNotifications}
          >
            <Ionicons name="notifications-off-outline" size={24} color={colors.primary} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>
                {t("notifSettings.permissionTitle")}
              </Text>
              <Text style={[styles.bannerDesc, { color: colors.textSecondary }]}>
                {t("notifSettings.permissionDesc")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
        )}

        {/* Section titre */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
          {t("notifSettings.typesTitle").toUpperCase()}
        </Text>

        {/* Toggles */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ToggleRow
            icon="flash-outline"
            label={t("notifSettings.breakingNews")}
            description={t("notifSettings.breakingNewsDesc")}
            value={breakingNews}
            onToggle={() => togglePref("breakingNews")}
            disabled={!permissionGranted}
          />

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <ToggleRow
            icon="newspaper-outline"
            label={t("notifSettings.dailyDigest")}
            description={t("notifSettings.dailyDigestDesc")}
            value={dailyDigest}
            onToggle={() => togglePref("dailyDigest")}
            disabled={!permissionGranted}
          />

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <ToggleRow
            icon="school-outline"
            label={t("notifSettings.quizReminders")}
            description={t("notifSettings.quizRemindersDesc")}
            value={quizReminders}
            onToggle={() => togglePref("quizReminders")}
            disabled={!permissionGranted}
          />

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          <ToggleRow
            icon="bookmark-outline"
            label={t("notifSettings.categoryAlerts")}
            description={t("notifSettings.categoryAlertsDesc")}
            value={categoryAlerts}
            onToggle={() => togglePref("categoryAlerts")}
            disabled={!permissionGranted}
          />
        </View>

        {/* Info */}
        <Text style={[styles.footnote, { color: colors.textMuted }]}>
          {t("notifSettings.footnote")}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },

  // Permission banner
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  bannerDesc: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Section
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  separator: {
    height: 1,
    marginLeft: 66,
  },

  // Footnote
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
