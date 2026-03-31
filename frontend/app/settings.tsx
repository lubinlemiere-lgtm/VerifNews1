// ###########################################################################
// # Settings — Page parametres complete
// # Sections: Compte, Apparence (theme, langue, taille texte),
// # General (categorie par defaut), Audio (vitesse TTS),
// # Soutenir (noter, partager), A propos (CGU, privacy, tuto, feedback, version),
// # Zone dangereuse
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuthStore } from "@/store/authStore";
import { useLanguageStore } from "@/store/languageStore";
import { useThemeStore } from "@/store/themeStore";
import { useTextSizeStore, type TextSizeChoice } from "@/store/textSizeStore";
import { usePreferencesStore } from "@/store/preferencesStore";
import api from "@/services/api";
import {
  SUPPORT_EMAIL,
  APP_VERSION,
  PLAY_STORE_URL,
  APP_SHARE_MESSAGE_FR,
  APP_SHARE_MESSAGE_EN,
} from "@/constants/config";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { withOpacity } from "@/utils/colors";

// ── Language options ────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { value: "auto" as const, labelKey: "lang.auto", icon: "phone-portrait-outline" as const },
  { value: "fr" as const, labelKey: "lang.french", flag: "FR" },
  { value: "en" as const, labelKey: "lang.english", flag: "EN" },
];

// ── Text size options ───────────────────────────────────────────────────
const TEXT_SIZE_OPTIONS: { value: TextSizeChoice; labelKey: string; preview: number }[] = [
  { value: "small", labelKey: "settings.textSmall", preview: 13 },
  { value: "normal", labelKey: "settings.textNormal", preview: 16 },
  { value: "large", labelKey: "settings.textLarge", preview: 20 },
  { value: "xlarge", labelKey: "settings.textXlarge", preview: 24 },
];

// ── TTS Speed options ───────────────────────────────────────────────────
const TTS_SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

// ── Section Header ──────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
      {title.toUpperCase()}
    </Text>
  );
}

// ── Setting Row ─────────────────────────────────────────────────────────
function SettingRow({
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
        styles.settingRow,
        { backgroundColor: colors.card },
        pressed && onPress && { backgroundColor: colors.surfaceLight },
      ]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name={icon} size={18} color={color || colors.primary} />
      </View>
      <Text style={[styles.settingLabel, { color: color || colors.text }]}>{label}</Text>
      {rightElement}
      {value != null && (
        <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
      )}
      {onPress && !rightElement && (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

// ── Row Separator ───────────────────────────────────────────────────────
function RowSeparator() {
  const colors = useColors();
  return <View style={[styles.rowSeparator, { backgroundColor: colors.border }]} />;
}

// ── Main Component ──────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { t, language } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadUser = useAuthStore((s) => s.loadUser);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const choice = useLanguageStore((s) => s.choice);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const textSize = useTextSizeStore((s) => s.size);
  const setTextSize = useTextSizeStore((s) => s.setSize);
  const categories = usePreferencesStore((s) => s.categories);
  const defaultCategory = usePreferencesStore((s) => s.defaultCategory);
  const ttsSpeed = usePreferencesStore((s) => s.ttsSpeed);
  const ttsEnabled = usePreferencesStore((s) => s.ttsEnabled);
  const setDefaultCategory = usePreferencesStore((s) => s.setDefaultCategory);
  const setTtsSpeed = usePreferencesStore((s) => s.setTtsSpeed);
  const setTtsEnabled = usePreferencesStore((s) => s.setTtsEnabled);

  // ── Edit name state ─────────────────────────────────────────────────
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [savingName, setSavingName] = useState(false);

  // ── Change password state ───────────────────────────────────────────
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Modal states ──────────────────────────────────────────────────────
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [textSizeModalVisible, setTextSizeModalVisible] = useState(false);
  const [defaultCategoryModalVisible, setDefaultCategoryModalVisible] = useState(false);
  const [ttsSpeedModalVisible, setTtsSpeedModalVisible] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const currentLangLabel =
    LANG_OPTIONS.find((o) => o.value === choice)?.labelKey || "lang.auto";

  const currentTextSizeLabel =
    TEXT_SIZE_OPTIONS.find((o) => o.value === textSize)?.labelKey || "settings.textNormal";

  // ── Compute default category label ────────────────────────────────────
  const getDefaultCategoryLabel = () => {
    if (defaultCategory === "all") return t("settings.allCategories");
    if (defaultCategory === "favorites") return t("settings.myFavorites");
    const cat = categories.find((c) => c.slug === defaultCategory);
    return cat?.name || defaultCategory;
  };

  // ── Save display name ───────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      await api.put("/auth/profile", { display_name: displayName.trim() });
      await loadUser();
      setNameModalVisible(false);
      Alert.alert(t("settings.saved"));
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || t("settings.error");
      Alert.alert(t("settings.error"), msg);
    } finally {
      setSavingName(false);
    }
  };

  // ── Change password ─────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword.length < 8) {
      Alert.alert(t("settings.error"), t("register.passwordTooShort"));
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      Alert.alert(t("settings.error"), t("register.passwordWeak"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("settings.error"), t("settings.passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    try {
      await api.put("/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert(t("settings.passwordChanged"));
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || t("settings.error");
      Alert.alert(t("settings.error"), msg);
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Share app ─────────────────────────────────────────────────────────
  const handleShareApp = async () => {
    const message =
      language === "fr"
        ? APP_SHARE_MESSAGE_FR + PLAY_STORE_URL
        : APP_SHARE_MESSAGE_EN + PLAY_STORE_URL;
    try {
      await Share.share({ message });
    } catch {}
  };

  // ── Reset onboarding — ouvre le tutoriel directement ────────────────
  const handleResetOnboarding = () => {
    setShowOnboarding(true);
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === "web" ? 16 : insets.top + 8,
          },
        ]}
      >
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
          {t("settings.title")}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══════════════════════════════════════════════════════════
            Section: Compte
           ═══════════════════════════════════════════════════════════ */}
        {isAuthenticated && (
          <>
            <SectionHeader title={t("settings.account")} />
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SettingRow
                icon="person-outline"
                label={t("settings.editName")}
                value={user?.display_name || "\u2014"}
                onPress={() => {
                  setDisplayName(user?.display_name || "");
                  setNameModalVisible(true);
                }}
              />
              <RowSeparator />
              <SettingRow
                icon="lock-closed-outline"
                label={t("settings.changePassword")}
                onPress={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordModalVisible(true);
                }}
              />
            </View>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════
            Section: Apparence
           ═══════════════════════════════════════════════════════════ */}
        <SectionHeader title={t("settings.appearance")} />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
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
          <RowSeparator />
          <SettingRow
            icon="language-outline"
            label={t("profile.language")}
            value={t(currentLangLabel)}
            onPress={() => setLangModalVisible(true)}
          />
          <RowSeparator />
          <SettingRow
            icon="text-outline"
            label={t("settings.textSize")}
            value={t(currentTextSizeLabel)}
            onPress={() => setTextSizeModalVisible(true)}
          />
        </View>

        {/* ═══════════════════════════════════════════════════════════
            Section: General
           ═══════════════════════════════════════════════════════════ */}
        <SectionHeader title={t("settings.general")} />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="grid-outline"
            label={t("settings.defaultCategory")}
            value={getDefaultCategoryLabel()}
            onPress={() => setDefaultCategoryModalVisible(true)}
          />
          <RowSeparator />
          <SettingRow
            icon="notifications-outline"
            label={t("profile.notifications")}
            onPress={() => router.push("/notification-settings" as any)}
          />
        </View>

        {/* ═══════════════════════════════════════════════════════════
            Section: Audio
           ═══════════════════════════════════════════════════════════ */}
        <SectionHeader title={t("settings.audio")} />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="volume-high-outline"
            label={t("settings.ttsEnabled")}
            rightElement={
              <Switch
                value={ttsEnabled}
                onValueChange={setTtsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          {ttsEnabled && (
            <>
              <RowSeparator />
              <SettingRow
                icon="speedometer-outline"
                label={t("settings.ttsSpeed")}
                value={ttsSpeed === 1 ? "1x" : ttsSpeed + "x"}
                onPress={() => setTtsSpeedModalVisible(true)}
              />
            </>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════════
            Section: Soutenir
           ═══════════════════════════════════════════════════════════ */}
        <SectionHeader title={t("settings.support")} />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="star-outline"
            label={t("settings.rateApp")}
            onPress={() => Linking.openURL(PLAY_STORE_URL)}
          />
          <RowSeparator />
          <SettingRow
            icon="share-social-outline"
            label={t("settings.shareApp")}
            onPress={handleShareApp}
          />
        </View>

        {/* ═══════════════════════════════════════════════════════════
            Section: A propos
           ═══════════════════════════════════════════════════════════ */}
        <SectionHeader title={t("settings.about")} />
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="document-outline"
            label={t("settings.terms")}
            onPress={() => router.push("/terms")}
          />
          <RowSeparator />
          <SettingRow
            icon="document-text-outline"
            label={t("profile.privacy")}
            onPress={() => router.push("/privacy")}
          />
          <RowSeparator />
          <SettingRow
            icon="school-outline"
            label={t("settings.resetOnboarding")}
            onPress={handleResetOnboarding}
          />
          <RowSeparator />
          <SettingRow
            icon="chatbubble-outline"
            label={t("profile.feedback")}
            onPress={() =>
              Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=VerifNews%20Feedback`)
            }
          />
          <RowSeparator />
          <SettingRow
            icon="information-circle-outline"
            label={t("settings.version")}
            value={APP_VERSION}
          />
        </View>

        {/* ═══════════════════════════════════════════════════════════
            Section: Zone dangereuse
           ═══════════════════════════════════════════════════════════ */}
        {isAuthenticated && (
          <>
            <SectionHeader title={t("settings.dangerZone")} />
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: withOpacity(colors.danger, 0.25) }]}>
              <SettingRow
                icon="download-outline"
                label={t("settings.exportData")}
                onPress={async () => {
                  try {
                    await api.get("/auth/export");
                    Alert.alert(
                      t("settings.exportData"),
                      t("settings.exportSuccess"),
                      [{ text: "OK" }]
                    );
                  } catch {
                    Alert.alert(t("settings.error"), t("settings.exportFailed"));
                  }
                }}
              />
              <RowSeparator />
              <SettingRow
                icon="trash-outline"
                label={t("settings.deleteAccount")}
                color={colors.danger}
                onPress={() => {
                  Alert.alert(
                    t("settings.deleteAccount"),
                    t("settings.deleteConfirm"),
                    [
                      { text: t("settings.cancel"), style: "cancel" },
                      {
                        text: t("settings.deleteForever"),
                        style: "destructive",
                        onPress: async () => {
                          try {
                            await api.delete("/auth/account");
                            useAuthStore.getState().logout();
                            router.replace("/(auth)/login" as any);
                          } catch {
                            Alert.alert(t("settings.error"), t("settings.deleteFailed"));
                          }
                        },
                      },
                    ]
                  );
                }}
              />
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════
          Modal: Edit display name
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={nameModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setNameModalVisible(false);
          }}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Keyboard.dismiss()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("settings.editName")}
            </Text>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t("settings.editName")}
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />

            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                savingName && { opacity: 0.6 },
              ]}
              onPress={handleSaveName}
              disabled={savingName}
            >
              {savingName ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t("settings.save")}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          Modal: Change password
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={passwordModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setPasswordModalVisible(false);
          }}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Keyboard.dismiss()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("settings.changePassword")}
            </Text>

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={t("settings.currentPassword")}
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoFocus
            />

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                  marginTop: 12,
                },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t("settings.newPassword")}
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />

            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surfaceLight,
                  color: colors.text,
                  borderColor: colors.border,
                  marginTop: 12,
                },
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("settings.confirmPassword")}
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
            />

            <Pressable
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                savingPassword && { opacity: 0.6 },
              ]}
              onPress={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>{t("settings.save")}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          Modal: Language picker
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={langModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setLangModalVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("profile.language")}
            </Text>
            {LANG_OPTIONS.map((opt) => {
              const isSelected = choice === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.langOption,
                    isSelected && { backgroundColor: withOpacity(colors.primary, 0.08) },
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

      {/* ═══════════════════════════════════════════════════════════════
          Modal: Text Size picker
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={textSizeModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setTextSizeModalVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("settings.textSize")}
            </Text>
            {TEXT_SIZE_OPTIONS.map((opt) => {
              const isSelected = textSize === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.langOption,
                    isSelected && { backgroundColor: withOpacity(colors.primary, 0.08) },
                  ]}
                  onPress={() => {
                    setTextSize(opt.value);
                    setTextSizeModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}>
                    <Text style={{ fontSize: opt.preview, fontWeight: "700", color: isSelected ? colors.primary : colors.text }}>
                      Aa
                    </Text>
                    <Text
                      style={[
                        styles.langOptionText,
                        { color: colors.text },
                        isSelected && { color: colors.primary, fontWeight: "700" },
                      ]}
                    >
                      {t(opt.labelKey)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          Modal: Default Category picker
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={defaultCategoryModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDefaultCategoryModalVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border, maxHeight: "70%" },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("settings.defaultCategory")}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* All */}
              <Pressable
                style={[
                  styles.langOption,
                  defaultCategory === "all" && { backgroundColor: withOpacity(colors.primary, 0.08) },
                ]}
                onPress={() => {
                  setDefaultCategory("all");
                  setDefaultCategoryModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.langOptionText,
                    { color: colors.text },
                    defaultCategory === "all" && { color: colors.primary, fontWeight: "700" },
                  ]}
                >
                  {t("settings.allCategories")}
                </Text>
                {defaultCategory === "all" && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>

              {/* Favorites */}
              <Pressable
                style={[
                  styles.langOption,
                  defaultCategory === "favorites" && { backgroundColor: withOpacity(colors.primary, 0.08) },
                ]}
                onPress={() => {
                  setDefaultCategory("favorites");
                  setDefaultCategoryModalVisible(false);
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="heart" size={16} color={defaultCategory === "favorites" ? colors.primary : colors.text} />
                  <Text
                    style={[
                      styles.langOptionText,
                      { color: colors.text },
                      defaultCategory === "favorites" && { color: colors.primary, fontWeight: "700" },
                    ]}
                  >
                    {t("settings.myFavorites")}
                  </Text>
                </View>
                {defaultCategory === "favorites" && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>

              {/* Each category */}
              {categories.map((cat) => {
                const isSelected = defaultCategory === cat.slug;
                return (
                  <Pressable
                    key={cat.slug}
                    style={[
                      styles.langOption,
                      isSelected && { backgroundColor: withOpacity(colors.primary, 0.08) },
                    ]}
                    onPress={() => {
                      setDefaultCategory(cat.slug);
                      setDefaultCategoryModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons
                        name={(cat.icon as any) || "folder-outline"}
                        size={16}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.langOptionText,
                          { color: colors.text },
                          isSelected && { color: colors.primary, fontWeight: "700" },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          Modal: TTS Speed picker
         ═══════════════════════════════════════════════════════════════ */}
      <Modal visible={ttsSpeedModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setTtsSpeedModalVisible(false)}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("settings.ttsSpeed")}
            </Text>
            {TTS_SPEED_OPTIONS.map((speed) => {
              const isSelected = ttsSpeed === speed;
              const label = speed === 1 ? "1x" : speed + "x";
              const desc =
                speed === 0.75
                  ? t("settings.ttsSpeedSlow")
                  : speed === 1
                    ? t("settings.ttsSpeedNormal")
                    : speed === 1.25
                      ? t("settings.ttsSpeedFast")
                      : t("settings.ttsSpeedVeryFast");
              return (
                <Pressable
                  key={speed}
                  style={[
                    styles.langOption,
                    isSelected && { backgroundColor: withOpacity(colors.primary, 0.08) },
                  ]}
                  onPress={() => {
                    setTtsSpeed(speed);
                    setTtsSpeedModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "700",
                        color: isSelected ? colors.primary : colors.text,
                        minWidth: 45,
                      }}
                    >
                      {label}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                      {desc}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── Tutoriel (OnboardingFlow) — ouvert depuis parametres ────── */}
      {showOnboarding && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
    </View>
  );
}

// ###########################################################################
// # Styles
// ###########################################################################

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────
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

  // ── Scroll ──────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ── Section ─────────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },

  // ── Setting row ─────────────────────────────────────────────────────
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  settingValue: {
    fontSize: 14,
    marginRight: 4,
  },
  rowSeparator: {
    height: 1,
    marginLeft: 64,
  },

  // ── Modal ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },

  // ── Inputs ──────────────────────────────────────────────────────────
  textInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    outlineWidth: 0,
  },

  // ── Save button ─────────────────────────────────────────────────────
  saveButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Language / picker options ──────────────────────────────────────
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
