// ###########################################################################
// # Reset Password — Ecran de reinitialisation du mot de passe
// # Etape 2: L'utilisateur arrive via un lien email avec un token
// # Saisir nouveau mot de passe + confirmation → API reset
// ###########################################################################

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/hooks/useTranslation";
import { authApi } from "@/services/authApi";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── Validation et envoi ───────────────────────────────────────
  const handleReset = async () => {
    setError("");

    if (!password || !confirmPassword) {
      setError(t("reset.fillFields"));
      return;
    }
    if (password.length < 8) {
      setError(t("register.passwordTooShort"));
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError(t("register.passwordWeak"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("reset.mismatch"));
      return;
    }
    if (!token) {
      setError(t("reset.invalidToken"));
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (detail?.toLowerCase().includes("expired")) {
        setError(t("reset.tokenExpired"));
      } else if (detail?.toLowerCase().includes("invalid")) {
        setError(t("reset.invalidToken"));
      } else {
        setError(detail || t("reset.failed"));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Ecran de succes ───────────────────────────────────────────
  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.success + "20" }]}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
          </View>
          <Text style={[styles.sentTitle, { color: colors.text }]}>
            {t("reset.successTitle")}
          </Text>
          <Text style={[styles.sentDesc, { color: colors.textSecondary }]}>
            {t("reset.successDesc")}
          </Text>

          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={styles.backBtnText}>{t("reset.goToLogin")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Formulaire de reinitialisation ────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <Pressable
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="lock-open-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("reset.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("reset.subtitle")}
          </Text>
        </View>

        {/* Bandeau erreur */}
        {error !== "" && (
          <View style={[styles.errorBanner, { backgroundColor: colors.danger + "18" }]}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Formulaire */}
        <View style={styles.form}>
          {/* New password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("reset.newPassword")}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: error && !password ? colors.danger : colors.border,
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("reset.newPasswordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(""); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {t("register.passwordHint")}
            </Text>
          </View>

          {/* Confirm password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t("reset.confirmPassword")}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: error && !confirmPassword ? colors.danger : colors.border,
                },
              ]}
            >
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t("reset.confirmPasswordPlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setError(""); }}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleReset}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <Button
            title={t("reset.submit")}
            onPress={handleReset}
            loading={loading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ###########################################################################
// # Styles
// ###########################################################################

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    left: 28,
    padding: 6,
    zIndex: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  // ── Bandeau erreur ──────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  // ── Formulaire ──────────────────────────────────────────────────────
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    outlineWidth: 0,
  },
  hint: {
    fontSize: 12,
    paddingLeft: 4,
  },
  // ── Ecran succes ────────────────────────────────────────────────────
  sentTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  sentDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
