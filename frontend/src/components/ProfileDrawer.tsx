// ###########################################################################
// # ProfileDrawer — Tiroir lateral style Twitter/X
// # Slide-in depuis la gauche, ~80% de largeur, feed visible derriere
// # Contenu: avatar, stats, settings, legal, deconnexion
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/authStore";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { useDrawerStore } from "@/store/drawerStore";
import { useLanguageStore } from "@/store/languageStore";
import { useQuizHistoryStore } from "@/store/quizHistoryStore";
import { useReactionStore } from "@/store/reactionStore";
import { useThemeStore } from "@/store/themeStore";
import { Button } from "@/components/ui/Button";
import { LevelProgress } from "@/components/LevelProgress";
import { SUPPORT_EMAIL, APP_VERSION, PLAY_STORE_URL, APP_SHARE_MESSAGE_FR, APP_SHARE_MESSAGE_EN } from "@/constants/config";

// ── Language options ──────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { value: "auto" as const, labelKey: "lang.auto", icon: "phone-portrait-outline" as const },
  { value: "fr" as const, labelKey: "lang.french", flag: "FR" },
  { value: "en" as const, labelKey: "lang.english", flag: "EN" },
];

// ── Menu Row ──────────────────────────────────────────────────────────────
function MenuRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  color?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuRow,
        pressed && onPress && { backgroundColor: colors.surfaceLight },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name={icon} size={18} color={color || colors.primary} />
      </View>
      <Text style={[styles.menuRowText, { color: color || colors.text }]}>{label}</Text>
      {rightElement}
      {value && (
        <Text style={[styles.menuRowValue, { color: colors.textSecondary }]}>{value}</Text>
      )}
      {onPress && !rightElement && (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────
function GroupSeparator() {
  const colors = useColors();
  return <View style={[styles.groupSeparator, { backgroundColor: colors.surfaceLight }]} />;
}

function ItemSeparator() {
  const colors = useColors();
  return <View style={[styles.itemSeparator, { backgroundColor: colors.border }]} />;
}

// ── Main component ────────────────────────────────────────────────────────
export function ProfileDrawer() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  // Compute drawer width dynamically based on actual screen size
  const drawerWidth = Math.min(screenWidth * 0.82, 360);

  const { isOpen, close } = useDrawerStore();
  const { user, isAuthenticated } = useAuthStore();
  const logout = useAuthStore((s) => s.logout);
  const { mode, toggleTheme } = useThemeStore();
  const { choice, setLanguage } = useLanguageStore();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const reactions = useReactionStore((s) => s.reactions);

  const [langModalVisible, setLangModalVisible] = useState(false);

  // Count liked articles
  const likeCount = Object.values(reactions).filter((r) => r === "like").length;

  // Quiz stats
  const quizStats = useQuizHistoryStore((s) => s.getStats)();

  // Animation values
  const translateX = useRef(new Animated.Value(-drawerWidth || -300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!drawerWidth) return; // Guard against 0 width (SSR)

    // Stop any running animations to prevent race conditions
    translateX.stopAnimation();
    overlayOpacity.stopAnimation();

    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -drawerWidth,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        // Only hide if the animation completed (wasn't interrupted by open)
        if (finished) setVisible(false);
      });
    }
  }, [isOpen, drawerWidth]);

  const handleLogout = () => {
    Alert.alert(t("profile.logOut"), t("profile.logoutConfirm"), [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("profile.logOut"),
        style: "destructive",
        onPress: () => {
          logout();
          close();
        },
      },
    ]);
  };

  const handlePrivacy = () => {
    close();
    router.push("/privacy");
  };

  const handleFeedback = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=VerifNews%20Feedback`);
  };

  const navigateAuth = (path: string) => {
    close();
    router.push(path as any);
  };

  const currentLangLabel =
    LANG_OPTIONS.find((o) => o.value === choice)?.labelKey || "lang.auto";

  // ── User initials ───────────────────────────────────────────────────
  const initials = user?.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // ── Language modal ──────────────────────────────────────────────────
  const langModal = (
    <Modal visible={langModalVisible} transparent animationType="fade">
      <Pressable style={styles.langOverlay} onPress={() => setLangModalVisible(false)}>
        <View
          style={[
            styles.langContent,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.langTitle, { color: colors.text }]}>
            {t("profile.language")}
          </Text>
          {LANG_OPTIONS.map((opt) => {
            const isSelected = choice === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.langOption,
                  isSelected && { backgroundColor: colors.primary + "15" },
                ]}
                onPress={() => {
                  setLanguage(opt.value);
                  setLangModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.langOptionText,
                    { color: colors.text },
                    isSelected && { color: colors.primary, fontWeight: "700" },
                  ]}
                >
                  {t(opt.labelKey)}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );

  if (!visible) return null;

  return (
    <View style={styles.fullscreen}>
      {langModal}

      {/* Overlay sombre (tap pour fermer) */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: drawerWidth,
            backgroundColor: colors.background,
            transform: [{ translateX }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.drawerContent,
            { paddingTop: (Platform.OS === "web" ? 20 : insets.top) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isAuthenticated ? (
            <>
              {/* ── Header connecte ──────────────────────────────── */}
              <View style={styles.profileHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={[styles.displayName, { color: colors.text }]}>
                  {user?.display_name || t("profile.defaultName")}
                </Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>
                  {user?.email}
                </Text>
                <View style={[styles.badge, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="shield-checkmark" size={13} color={colors.verified} />
                  <Text style={[styles.badgeText, { color: colors.verified }]}>
                    {t("profile.member")}
                  </Text>
                </View>
              </View>

              {/* ── Gamification — Niveau et progression ──────────── */}
              <LevelProgress />

              {/* ── Stats ────────────────────────────────────────── */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {bookmarks.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {" "}{t("profile.saved")}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {likeCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {" "}{t("profile.liked")}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {quizStats.totalPlayed}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {" "}{t("tabs.quiz")}
                  </Text>
                </View>
              </View>

              <GroupSeparator />

              {/* ── Apparence ─────────────────────────────────────── */}
              <MenuRow
                icon="moon-outline"
                label={t("profile.darkMode")}
                rightElement={
                  <Switch
                    value={mode === "dark"}
                    onValueChange={toggleTheme}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                }
              />
              <ItemSeparator />
              <MenuRow
                icon="language-outline"
                label={t("profile.language")}
                value={t(currentLangLabel)}
                onPress={() => setLangModalVisible(true)}
              />

              <GroupSeparator />

              {/* ── General ───────────────────────────────────────── */}
              <MenuRow
                icon="globe-outline"
                label={t("profile.country")}
                value={user?.country_code || "FR"}
                onPress={() => {
                  close();
                  // Navigate to home with country picker — for now show alert
                  Alert.alert(
                    t("profile.country"),
                    t("profile.countryHint"),
                    [{ text: "OK" }]
                  );
                }}
              />
              <ItemSeparator />
              <MenuRow
                icon="settings-outline"
                label={t("settings.settings")}
                onPress={() => {
                  close();
                  router.push("/settings" as any);
                }}
              />
              <ItemSeparator />
              <MenuRow
                icon="notifications-outline"
                label={t("profile.notifications")}
                onPress={() => {
                  close();
                  router.push("/notification-settings" as any);
                }}
              />

              <GroupSeparator />

              {/* ── Soutenir ──────────────────────────────────────── */}
              <MenuRow
                icon="star-outline"
                label={t("settings.rateApp")}
                onPress={() => Linking.openURL(PLAY_STORE_URL)}
              />
              <ItemSeparator />
              <MenuRow
                icon="share-social-outline"
                label={t("settings.shareApp")}
                onPress={async () => {
                  const msg = APP_SHARE_MESSAGE_FR + PLAY_STORE_URL;
                  try { await Share.share({ message: msg }); } catch {}
                }}
              />

              <GroupSeparator />

              {/* ── Legal ─────────────────────────────────────────── */}
              <MenuRow
                icon="document-outline"
                label={t("settings.terms")}
                onPress={() => { close(); router.push("/terms" as any); }}
              />
              <ItemSeparator />
              <MenuRow
                icon="document-text-outline"
                label={t("profile.privacy")}
                onPress={handlePrivacy}
              />
              <ItemSeparator />
              <MenuRow
                icon="chatbubble-outline"
                label={t("profile.feedback")}
                onPress={handleFeedback}
              />

              <GroupSeparator />

              {/* ── Deconnexion ────────────────────────────────────── */}
              <MenuRow
                icon="log-out-outline"
                label={t("profile.logOut")}
                onPress={handleLogout}
                color={colors.danger}
              />
            </>
          ) : (
            <>
              {/* ── Header guest ─────────────────────────────────── */}
              <View style={styles.profileHeader}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="person-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={[styles.displayName, { color: colors.text }]}>
                  {t("profile.joinTitle")}
                </Text>
                <Text
                  style={[
                    styles.guestSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("profile.joinSubtitle")}
                </Text>
              </View>

              <View style={styles.guestButtons}>
                <Button
                  title={t("profile.createAccount")}
                  onPress={() => navigateAuth("/(auth)/register")}
                />
                <Button
                  title={t("profile.logIn")}
                  variant="outline"
                  onPress={() => navigateAuth("/(auth)/login")}
                />
              </View>

              <GroupSeparator />

              {/* ── Apparence (guest) ────────────────────────────── */}
              <MenuRow
                icon="moon-outline"
                label={t("profile.darkMode")}
                rightElement={
                  <Switch
                    value={mode === "dark"}
                    onValueChange={toggleTheme}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                }
              />
              <ItemSeparator />
              <MenuRow
                icon="language-outline"
                label={t("profile.language")}
                value={t(currentLangLabel)}
                onPress={() => setLangModalVisible(true)}
              />

              <GroupSeparator />

              {/* ── Soutenir (guest) ──────────────────────────────── */}
              <MenuRow
                icon="star-outline"
                label={t("settings.rateApp")}
                onPress={() => Linking.openURL(PLAY_STORE_URL)}
              />
              <ItemSeparator />
              <MenuRow
                icon="share-social-outline"
                label={t("settings.shareApp")}
                onPress={async () => {
                  const msg = APP_SHARE_MESSAGE_FR + PLAY_STORE_URL;
                  try { await Share.share({ message: msg }); } catch {}
                }}
              />

              <GroupSeparator />

              {/* ── Legal (guest) ─────────────────────────────────── */}
              <MenuRow
                icon="document-outline"
                label={t("settings.terms")}
                onPress={() => { close(); router.push("/terms" as any); }}
              />
              <ItemSeparator />
              <MenuRow
                icon="document-text-outline"
                label={t("profile.privacy")}
                onPress={handlePrivacy}
              />
            </>
          )}

          {/* ── Version ──────────────────────────────────────────── */}
          <Text style={[styles.version, { color: colors.textMuted }]}>
            VerifNews v{APP_VERSION}
          </Text>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ###########################################################################
// # Styles
// ###########################################################################

const styles = StyleSheet.create({
  fullscreen: {
    position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  drawerContent: {
    paddingBottom: 40,
  },

  // ── Profile header ──────────────────────────────────────────────────
  profileHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  displayName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  guestButtons: {
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 8,
  },

  // ── Stats ───────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 15,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 15,
  },

  // ── Menu rows ───────────────────────────────────────────────────────
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  menuRowValue: {
    fontSize: 14,
    marginRight: 4,
  },

  // ── Separators ──────────────────────────────────────────────────────
  groupSeparator: {
    height: 6,
    marginVertical: 4,
  },
  itemSeparator: {
    height: 1,
    marginLeft: 76,
  },

  // ── Version ─────────────────────────────────────────────────────────
  version: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 30,
  },

  // ── Language modal ──────────────────────────────────────────────────
  langOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  langContent: {
    width: "80%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  langTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  langOptionText: {
    fontSize: 16,
  },
});
